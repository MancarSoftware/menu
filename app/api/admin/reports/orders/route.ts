import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { apiError } from "@/lib/api";
import { requireRoleApi } from "@/lib/auth";
import { getBusinessDate, isBusinessDate } from "@/lib/business-date";
import { db } from "@/lib/db";
import { orderInclude, toOrderView } from "@/lib/order-serializers";

function csvCell(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

export async function GET(request: NextRequest) {
  try {
    if (!(await requireRoleApi(["ADMIN", "CASHIER"]))) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    const params = request.nextUrl.searchParams;
    const from = params.get("from") ?? getBusinessDate();
    const to = params.get("to") ?? from;
    if (!isBusinessDate(from) || !isBusinessDate(to) || from > to) return NextResponse.json({ error: "Rango de fechas inválido." }, { status: 400 });
    const where: Prisma.CustomerOrderWhereInput = {
      businessDate: { gte: from, lte: to },
      ...(params.get("status") ? { status: params.get("status")! } : {}),
      ...(params.get("paymentMethod") ? { paymentMethod: params.get("paymentMethod")! } : {}),
      ...(params.get("mode") ? { mode: params.get("mode")! } : {}),
      ...(params.get("table") ? { diningTable: { number: Number(params.get("table")) } } : {}),
    };
    const orders = await db.customerOrder.findMany({ where, orderBy: [{ businessDate: "desc" }, { dailyNumber: "desc" }], include: orderInclude, take: 500 });
    if (params.get("format") === "csv") {
      const header = ["Fecha", "Pedido", "Canal", "Mesa", "Estado", "Pago", "Método", "Cliente", "Total"];
      const rows = orders.map((order) => [order.businessDate, order.dailyNumber, order.mode, order.diningTable?.number ?? "", order.status, order.paymentStatus, order.paymentMethod ?? "", order.customerName ?? "", (order.totalCents / 100).toFixed(2)]);
      const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
      return new NextResponse(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="pedidos-${from}-${to}.csv"` } });
    }
    return NextResponse.json({ orders: orders.map(toOrderView), from, to });
  } catch (error) { return apiError(error); }
}
