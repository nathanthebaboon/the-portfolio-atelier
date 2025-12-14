import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

export const runtime = "nodejs";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: Request) {
  try {
    const fd = await req.formData();

    const orderId = fd.get("orderId");
    const sectionIdx = fd.get("sectionIdx");
    const fileIdx = fd.get("fileIdx");
    const file = fd.get("file");

    if (typeof orderId !== "string") {
      return NextResponse.json({ ok: false, error: "Missing orderId" }, { status: 400 });
    }
    if (typeof sectionIdx !== "string" || typeof fileIdx !== "string") {
      return NextResponse.json({ ok: false, error: "Missing sectionIdx/fileIdx" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "data", "uploads", orderId);
    await fs.mkdir(uploadDir, { recursive: true });

    const storedName = `s${sectionIdx}_f${fileIdx}_${safeName(file.name)}`;
    const outPath = path.join(uploadDir, storedName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(outPath, buffer);

    return NextResponse.json({ ok: true, storedName });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
