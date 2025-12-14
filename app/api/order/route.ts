import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

export const runtime = "nodejs";

/**
 * POST /api/order
 * Saves order metadata (NO FILES) and returns an orderId
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Basic validation
    if (!body?.name || !body?.email) {
      return NextResponse.json(
        { ok: false, error: "Name and email are required." },
        { status: 400 }
      );
    }

    // Generate simple unique order id
    const orderId = `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

    const record = {
      id: orderId,
      ...body,
      createdAt: new Date().toISOString(),
    };

    // Ensure data directory exists
    const ordersDir = path.join(process.cwd(), "data", "orders");
    await fs.mkdir(ordersDir, { recursive: true });

    // Write order JSON
    const filePath = path.join(ordersDir, `${orderId}.json`);
    await fs.writeFile(filePath, JSON.stringify(record, null, 2), "utf-8");

    return NextResponse.json({ ok: true, id: orderId });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to save order." },
      { status: 500 }
    );
  }
}
