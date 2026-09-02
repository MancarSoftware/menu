import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { orderInclude, toOrderView } from "@/lib/order-serializers";
import { driverPaymentMethods } from "@/lib/delivery";
import { getBusinessDateRange, isBusinessDate } from "@/lib/business-date";
import type { Prisma } from "@prisma/client";

export async function GET(request?: Request) {
  try {
    const session = await requireRoleApi(["ADMIN", "CASHIER", "DRIVER"]);
    if (!session) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    const manager = session.role !== "DRIVER";
    const params = new URL(request?.url ?? "http://localhost/api/admin/deliveries").searchParams;
    const history = params.get("view") === "history";
    const date = params.get("date");
    const page = Number(params.get("page") ?? 1);
    if ((date && !isBusinessDate(date)) || !Number.isSafeInteger(page) || page < 1 || page > 100000) return NextResponse.json({ error: "Fecha o página inválida." }, { status: 400 });
    const range = date ? getBusinessDateRange(date) : null;
    const where: Prisma.CustomerOrderWhereInput = {
      mode: "DELIVERY", ...(manager ? {} : { assignedDriverId: session.id }),
      ...(history ? { deliveryStatus: "DELIVERED", status: { not: "CANCELLED" }, ...(range ? { OR: [{ deliveredAt: { gte: range.start, lt: range.end } }, { deliveredAt: null, createdAt: { gte: range.start, lt: range.end } }] } : {}) } : { status: { notIn: ["PAID", "CANCELLED"] } }),
    };
    const [orders, drivers, total] = await Promise.all([
      db.customerOrder.findMany({
        where,
        include: { ...orderInclude, assignedDriver: { select: { id: true, name: true } } },
        orderBy: history ? [{ deliveredAt: { sort: "desc", nulls: "last" } }, { id: "desc" }] : { createdAt: "asc" },
        ...(history ? { take: 20, skip: (page - 1) * 20 } : {}),
      }),
      manager ? db.adminUser.findMany({ where: { role: "DRIVER", isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
      db.customerOrder.count({ where }),
    ]);
    return NextResponse.json({ orders: orders.map((order) => ({ ...toOrderView(order), assignedDriver: order.assignedDriver, deliveredAt: order.deliveredAt?.toISOString() ?? null })), drivers, canCollectCash: session.canCollectCash, allowedPaymentMethods: driverPaymentMethods(session), total, page, pageSize: history ? 20 : total }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
