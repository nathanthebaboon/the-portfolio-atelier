import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const orderId = String(form.get("orderId") || "");
    const sectionIdx = Number(form.get("sectionIdx"));
    const fileIdx = Number(form.get("fileIdx"));
    const file = form.get("file") as File | null;

    if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
    if (!Number.isFinite(sectionIdx) || sectionIdx < 0)
      return NextResponse.json({ error: "Invalid sectionIdx" }, { status: 400 });
    if (!Number.isFinite(fileIdx) || fileIdx < 0)
      return NextResponse.json({ error: "Invalid fileIdx" }, { status: 400 });

    // Upload to Blob
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const blobPath = `orders/${orderId}/s${sectionIdx}-f${fileIdx}.${ext}`;

    const blob = await put(blobPath, file, {
      access: "public",
      contentType: file.type || "application/octet-stream",
    });

    // Save file record in Postgres via Prisma
    await prisma.orderFile.create({
      data: {
        orderId,
        sectionIdx,
        fileIdx,
        originalName: file.name,
        blobUrl: blob.url,
      },
    });

    return NextResponse.json({ storedName: blobPath, url: blob.url }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
