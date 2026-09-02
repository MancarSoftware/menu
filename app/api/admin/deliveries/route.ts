import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { orderInclude, toOrderView } from "@/lib/order-serializers";

export async function GET() {
  try {
    const session = await requireRoleApi(["ADMIN", "CASHIER", "DRIVER"]);
    if (!session) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    const manager = session.role !== "DRIVER";
    const [orders, drivers] = await Promise.all([
      db.customerOrder.findMany({
        where: { mode: "DELIVERY", status: { notIn: ["PAID", "CANCELLED"] }, ...(manager ? {} : { assignedDriverId: session.id }) },
        include: { ...orderInclude, assignedDriver: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      }),
      manager ? db.adminUser.findMany({ where: { role: "DRIVER", isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    ]);
    return NextResponse.json({ orders: orders.map((order) => ({ ...toOrderView(order), assignedDriver: order.assignedDriver })), drivers, canCollectCash: session.canCollectCash }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
