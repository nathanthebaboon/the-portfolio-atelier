import { NextResponse } from "next/server";
import { createClient } from "@vercel/postgres";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    const client = createClient({
      connectionString: process.env.POSTGRES_URL_NON_POOLING,
    });
    await client.connect();

    await client.sql`CREATE EXTENSION IF NOT EXISTS pgcrypto;`;

    await client.sql`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    const { rows } = await client.sql`
      INSERT INTO orders (payload)
      VALUES (${payload})
      RETURNING id;
    `;

    await client.end();

    return NextResponse.json({ id: rows[0].id });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Order creation failed" },
      { status: 500 }
    );
  }
}
