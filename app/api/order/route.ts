import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    const order = await prisma.order.create({
      data: { payload },
      select: { id: true },
    });

    return NextResponse.json({ id: order.id }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Order creation failed" },
      { status: 500 }
    );
  }
}
