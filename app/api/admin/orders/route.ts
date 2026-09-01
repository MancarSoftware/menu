import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireRoleApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderInclude, toOrderView } from "@/lib/order-serializers";

export async function GET() {
  try {
    if (!(await requireRoleApi(["ADMIN", "CASHIER", "WAITER", "KITCHEN"]))) return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    const orders = await db.customerOrder.findMany({ where: { status: { notIn: ["PAID", "CANCELLED"] } }, orderBy: { createdAt: "asc" }, include: orderInclude });
    return NextResponse.json({ orders: orders.map(toOrderView) });
  } catch (error) { return apiError(error); }
}
