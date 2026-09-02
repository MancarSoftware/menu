import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, apiError } from "@/lib/api";
import { requireRoleApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { staffDisplayName } from "@/lib/payment-labels";
import { paymentMethodSchema } from "@/lib/validation";

const common = { version: z.number().int().positive(), reason: z.string().trim().min(4).max(240) };
const schema = z.discriminatedUnion("action", [
  z.object({ ...common, action: z.literal("REFUND"), amountCents: z.number().int().positive() }),
  z.object({ ...common, action: z.literal("CHANGE_METHOD"), paymentMethod: paymentMethodSchema, confirmedCashReceived: z.boolean().optional() }),
]);
class CorrectionError extends Error {}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRoleApi(["ADMIN", "CASHIER"]);
    if (!session) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const orderId = Number((await context.params).id);
    if (!Number.isSafeInteger(orderId) || orderId < 1) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
    const input = schema.parse(await request.json());
    await db.$transaction(async (tx) => {
      const initial = await tx.customerOrder.findUnique({ where: { id: orderId }, include: { paymentEvents: true } });
      if (!initial) throw new CorrectionError("El pedido no existe.");
      const openShift = await tx.cashRegisterShift.findFirst({ where: { status: "OPEN" }, orderBy: { openedAt: "desc" } });
      const shiftIds = [...new Set([...(openShift ? [openShift.id] : []), ...initial.paymentEvents.flatMap((event) => event.shiftId ? [event.shiftId] : [])])].sort();
      const shiftStates = new Map<string, string>();
      // Same lock order as collection, handover and cash closing.
      for (const shiftId of shiftIds) {
        const rows = await tx.$queryRaw<{ status: string }[]>`SELECT "status" FROM "CashRegisterShift" WHERE "id" = ${shiftId} FOR UPDATE`;
        if (rows[0]) shiftStates.set(shiftId, rows[0].status);
      }
      await tx.$queryRaw`SELECT "id" FROM "CustomerOrder" WHERE "id" = ${orderId} FOR UPDATE`;
      const order = await tx.customerOrder.findUniqueOrThrow({ where: { id: orderId }, include: { paymentEvents: { include: { handover: true } } } });
      if (order.version !== input.version) throw new CorrectionError("El pago cambió. Vuelve a abrir el comprobante antes de intentar otra corrección.");
      if (!["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(order.paymentStatus)) throw new CorrectionError("El pedido no tiene un pago corregible.");
      const payments = order.paymentEvents.filter((event) => event.type === "PAYMENT");
      const refunds = order.paymentEvents.filter((event) => event.type === "REFUND").reduce((sum, event) => sum + event.amountCents, 0);
      const netPaid = payments.reduce((sum, event) => sum + event.amountCents, 0) - refunds;
      const activeShiftId = openShift && shiftStates.get(openShift.id) === "OPEN" ? openShift.id : null;
      if (input.action === "REFUND") {
        if (input.amountCents > netPaid) throw new CorrectionError("El reembolso supera el saldo pagado.");
        if (!order.paymentMethod) throw new CorrectionError("Revisa el método de pago antes de reembolsar.");
        if (order.paymentMethod === "CASH" && !activeShiftId) throw new CorrectionError("Abre la caja antes de registrar un reembolso en efectivo.");
        await tx.paymentEvent.create({ data: { orderId, shiftId: activeShiftId, type: "REFUND", method: order.paymentMethod, amountCents: input.amountCents, reason: input.reason, actorUserId: session.id, actorName: staffDisplayName(session.name), cashCustody: order.paymentMethod === "CASH" ? "REGISTER" : null } });
        await tx.customerOrder.update({ where: { id: orderId }, data: { paymentStatus: netPaid === input.amountCents ? "REFUNDED" : "PARTIALLY_REFUNDED", version: { increment: 1 } } });
      } else {
        if (input.paymentMethod === order.paymentMethod) return;
        if (refunds || payments.some((event) => event.handover)) throw new CorrectionError("Este pago ya tiene reembolsos o una entrega de efectivo confirmada; no se puede reescribir su método.");
        if (payments.some((event) => event.shiftId && shiftStates.get(event.shiftId) !== "OPEN")) throw new CorrectionError("El pago pertenece a una caja cerrada. No se modifican cierres históricos.");
        if (input.paymentMethod === "CASH" && (!activeShiftId || !input.confirmedCashReceived)) throw new CorrectionError("Abre la caja y confirma que el efectivo está físicamente en caja antes de corregirlo.");
        await tx.paymentEvent.updateMany({ where: { orderId, type: "PAYMENT" }, data: { method: input.paymentMethod, cashCustody: input.paymentMethod === "CASH" ? "REGISTER" : null, ...(input.paymentMethod === "CASH" ? { shiftId: activeShiftId } : {}) } });
        await tx.customerOrder.update({ where: { id: orderId }, data: { paymentMethod: input.paymentMethod, version: { increment: 1 } } });
      }
      await tx.auditLog.create({ data: { actorUserId: session.id, actorName: staffDisplayName(session.name), action: input.action === "REFUND" ? "PAYMENT_REFUNDED" : "PAYMENT_METHOD_CORRECTED", entityType: "CustomerOrder", entityId: String(orderId), details: JSON.stringify({ ...input, from: order.paymentMethod }) } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CorrectionError) return NextResponse.json({ error: error.message }, { status: 409 });
    return apiError(error);
  }
}
