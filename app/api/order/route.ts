import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto;`;

    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    const { rows } = await sql`
      INSERT INTO orders (payload)
      VALUES (${payload})
      RETURNING id;
    `;

    return NextResponse.json({ id: rows[0].id }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Order creation failed" },
      { status: 500 }
    );
  }
}
