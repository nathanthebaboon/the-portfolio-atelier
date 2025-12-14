import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { sql } from "@vercel/postgres";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const orderId = String(form.get("orderId") || "");
    const sectionIdx = Number(form.get("sectionIdx"));
    const fileIdx = Number(form.get("fileIdx"));
    const file = form.get("file") as File | null;

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        orderId
      )
    ) {
      return NextResponse.json({ error: "Invalid orderId" }, { status: 400 });
    }

    if (!Number.isFinite(sectionIdx) || sectionIdx < 0) {
      return NextResponse.json({ error: "Invalid sectionIdx" }, { status: 400 });
    }

    if (!Number.isFinite(fileIdx) || fileIdx < 0) {
      return NextResponse.json({ error: "Invalid fileIdx" }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    // Upload to Blob
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const blobPath = `orders/${orderId}/s${sectionIdx}-f${fileIdx}.${ext}`;

    const blob = await put(blobPath, file, {
      access: "public",
      contentType: file.type || "application/octet-stream",
    });

    // Track uploads in Postgres
    await sql`
      CREATE TABLE IF NOT EXISTS order_files (
        id BIGSERIAL PRIMARY KEY,
        order_id UUID NOT NULL,
        section_idx INT NOT NULL,
        file_idx INT NOT NULL,
        original_name TEXT NOT NULL,
        blob_url TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    await sql`
      INSERT INTO order_files (order_id, section_idx, file_idx, original_name, blob_url)
      VALUES (${orderId}::uuid, ${sectionIdx}, ${fileIdx}, ${file.name}, ${blob.url});
    `;

    return NextResponse.json({ storedName: blobPath, url: blob.url }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
