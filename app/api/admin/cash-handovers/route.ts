import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, assertSameOrigin } from "@/lib/api";
import { requireRoleApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { CashHandoverError, confirmCashHandover, pendingDriverCash } from "@/lib/cash-handover";
import { staffDisplayName } from "@/lib/payment-labels";

export async function GET() {
  try {
    const actor = await requireRoleApi(["ADMIN", "CASHIER", "DRIVER"]);
    if (!actor) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    const scope = actor.role === "DRIVER" ? { actorUserId: actor.id } : {};
    const where = { ...pendingDriverCash, ...scope };
    const [pending, totals, history] = await Promise.all([
      db.paymentEvent.findMany({ where, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 100, select: { id: true, amountCents: true, actorName: true, createdAt: true, order: { select: { dailyNumber: true, businessDate: true } }, shift: { select: { status: true } } } }),
      db.paymentEvent.aggregate({ where, _sum: { amountCents: true }, _count: { _all: true } }),
      db.driverCashHandover.findMany({ where: actor.role === "DRIVER" ? { driverId: actor.id } : {}, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 30, select: { id: true, driverName: true, receivedByName: true, amountCents: true, createdAt: true, paymentEvent: { select: { order: { select: { dailyNumber: true, businessDate: true } } } } } }),
    ]);
    return NextResponse.json({ pending: pending.map((event) => ({ id: event.id, amountCents: event.amountCents, driverName: staffDisplayName(event.actorName), createdAt: event.createdAt.toISOString(), orderNumber: event.order.dailyNumber, orderDate: event.order.businessDate, canReceive: event.shift?.status === "OPEN" })), totalPendingCents: totals._sum.amountCents ?? 0, pendingCount: totals._count._all, history: history.map((event) => ({ id: event.id, driverName: staffDisplayName(event.driverName), receivedByName: staffDisplayName(event.receivedByName), amountCents: event.amountCents, createdAt: event.createdAt.toISOString(), orderNumber: event.paymentEvent.order.dailyNumber, orderDate: event.paymentEvent.order.businessDate })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRoleApi(["ADMIN", "CASHIER"]);
    if (!actor) return NextResponse.json({ error: "Solo caja o administración puede confirmar una entrega." }, { status: 403 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const input = z.object({ paymentEventId: z.string().min(1).max(100), confirmedReceived: z.literal(true) }).parse(await request.json());
    const result = await confirmCashHandover(input.paymentEventId, actor);
    return NextResponse.json({ id: result.id });
  } catch (error) {
    if (error instanceof CashHandoverError) return NextResponse.json({ error: error.message }, { status: 409 });
    return apiError(error);
  }
}
