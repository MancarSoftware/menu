import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { orderInclude, toOrderView } from "@/lib/order-serializers";

export async function GET(_request: Request, context: { params: Promise<{ publicId: string }> }) {
  try {
    const { publicId } = await context.params;
    const order = await db.customerOrder.findUnique({ where: { publicId }, include: orderInclude });
    if (!order) return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
    return NextResponse.json({ order: toOrderView(order) });
  } catch (error) { return apiError(error); }
}
