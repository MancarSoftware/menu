import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, apiError } from "@/lib/api";
import { requireRoleApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { staffDisplayName } from "@/lib/payment-labels";
import { paymentMethodSchema } from "@/lib/validation";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("REFUND"), amountCents: z.number().int().positive(), reason: z.string().trim().min(4).max(240) }),
  z.object({ action: z.literal("CHANGE_METHOD"), paymentMethod: paymentMethodSchema, reason: z.string().trim().min(4).max(240) }),
]);

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRoleApi(["ADMIN", "CASHIER"]);
    if (!session) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const { id } = await context.params;
    const orderId = Number(id);
    const input = schema.parse(await request.json());
    const order = await db.customerOrder.findUnique({ where: { id: orderId }, include: { paymentEvents: true } });
    if (!order || !["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(order.paymentStatus)) return NextResponse.json({ error: "El pedido no tiene un pago corregible." }, { status: 409 });
    const payments = order.paymentEvents.filter((event) => event.type === "PAYMENT").reduce((sum, event) => sum + event.amountCents, 0);
    const refunds = order.paymentEvents.filter((event) => event.type === "REFUND").reduce((sum, event) => sum + event.amountCents, 0);
    const netPaid = payments - refunds;

    if (input.action === "REFUND") {
      if (input.amountCents > netPaid) return NextResponse.json({ error: "El reembolso supera el saldo pagado." }, { status: 400 });
      const openShift = await db.cashRegisterShift.findFirst({ where: { status: "OPEN" }, orderBy: { openedAt: "desc" } });
      if (order.paymentMethod === "CASH" && !openShift) return NextResponse.json({ error: "Abre la caja antes de registrar un reembolso en efectivo." }, { status: 409 });
      const nextNet = netPaid - input.amountCents;
      await db.$transaction([
        db.paymentEvent.create({ data: { orderId, shiftId: openShift?.id, type: "REFUND", method: order.paymentMethod ?? "CASH", amountCents: input.amountCents, reason: input.reason, actorUserId: session.id, actorName: staffDisplayName(session.name) } }),
        db.customerOrder.update({ where: { id: orderId }, data: { paymentStatus: nextNet === 0 ? "REFUNDED" : "PARTIALLY_REFUNDED", version: { increment: 1 } } }),
        db.auditLog.create({ data: { actorUserId: session.id, actorName: staffDisplayName(session.name), action: "PAYMENT_REFUNDED", entityType: "CustomerOrder", entityId: String(orderId), details: JSON.stringify({ amountCents: input.amountCents, reason: input.reason }) } }),
      ]);
    } else {
      const affectedShiftIds = [...new Set(order.paymentEvents.filter((event) => event.type === "PAYMENT" && event.shiftId).map((event) => event.shiftId!))];
      await db.$transaction(async (transaction) => {
        await transaction.paymentEvent.updateMany({ where: { orderId, type: "PAYMENT" }, data: { method: input.paymentMethod } });
        await transaction.customerOrder.update({ where: { id: orderId }, data: { paymentMethod: input.paymentMethod, version: { increment: 1 } } });
        for (const shiftId of affectedShiftIds) {
          const shift = await transaction.cashRegisterShift.findUnique({ where: { id: shiftId } });
          if (!shift || shift.status !== "CLOSED" || shift.actualCashCents === null) continue;
          const totals = await transaction.paymentEvent.groupBy({ by: ["type"], where: { shiftId, method: "CASH" }, _sum: { amountCents: true } });
          const cashSalesCents = (totals.find((row) => row.type === "PAYMENT")?._sum.amountCents ?? 0) - (totals.find((row) => row.type === "REFUND")?._sum.amountCents ?? 0);
          const expectedCashCents = shift.openingBalanceCents + cashSalesCents;
          await transaction.cashRegisterShift.update({ where: { id: shiftId }, data: { expectedCashCents, discrepancyCents: shift.actualCashCents - expectedCashCents } });
        }
        await transaction.auditLog.create({ data: { actorUserId: session.id, actorName: staffDisplayName(session.name), action: "PAYMENT_METHOD_CORRECTED", entityType: "CustomerOrder", entityId: String(orderId), details: JSON.stringify({ from: order.paymentMethod, to: input.paymentMethod, reason: input.reason }) } });
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
