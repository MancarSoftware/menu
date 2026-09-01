import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireRoleApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderInclude, toOrderView } from "@/lib/order-serializers";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireRoleApi(["ADMIN", "CASHIER", "WAITER", "KITCHEN"]))) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    const { id } = await context.params;
    const order = await db.customerOrder.findUnique({ where: { id: Number(id) }, include: { ...orderInclude, paymentEvents: { orderBy: { createdAt: "asc" } }, statusHistory: { orderBy: { createdAt: "asc" } } } });
    if (!order) return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
    return NextResponse.json({ order: toOrderView(order), paymentEvents: order.paymentEvents.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })), statusHistory: order.statusHistory.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() })) });
  } catch (error) { return apiError(error); }
}
