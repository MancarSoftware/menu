import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { staffDisplayName } from "./payment-labels";

export class CashHandoverError extends Error {}

export const pendingDriverCash = { type: "PAYMENT", method: "CASH", cashCustody: "DRIVER", handover: { is: null } } satisfies Prisma.PaymentEventWhereInput;

export async function pendingDriverCashCents(client: Pick<Prisma.TransactionClient, "paymentEvent">, shiftId: string) {
  const total = await client.paymentEvent.aggregate({ where: { ...pendingDriverCash, shiftId }, _sum: { amountCents: true } });
  return total._sum.amountCents ?? 0;
}

export async function confirmCashHandover(paymentEventId: string, actor: { id: string; name: string }) {
  return db.$transaction(async (tx) => {
    const initial = await tx.paymentEvent.findUnique({ where: { id: paymentEventId } });
    if (!initial?.shiftId) throw new CashHandoverError("Este cobro no tiene un turno conciliable.");
    // Same lock order as payments, refunds and closing: shift, then payment.
    const shifts = await tx.$queryRaw<{ status: string }[]>`SELECT "status" FROM "CashRegisterShift" WHERE "id" = ${initial.shiftId} FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "PaymentEvent" WHERE "id" = ${paymentEventId} FOR UPDATE`;
    const event = await tx.paymentEvent.findUnique({ where: { id: paymentEventId }, include: { handover: true } });
    if (!event || event.type !== "PAYMENT" || event.method !== "CASH" || event.cashCustody !== "DRIVER" || !event.actorUserId) throw new CashHandoverError("El movimiento no es un cobro en efectivo de un repartidor.");
    if (event.handover) return event.handover; // Safe retry after a lost response.
    if (shifts[0]?.status !== "OPEN") throw new CashHandoverError("El turno está cerrado. No se puede modificar su entrega de efectivo.");
    if (event.actorUserId === actor.id) throw new CashHandoverError("Otra persona de caja debe confirmar la recepción.");
    const handover = await tx.driverCashHandover.create({ data: {
      paymentEventId, driverId: event.actorUserId, driverName: staffDisplayName(event.actorName),
      receivedById: actor.id, receivedByName: staffDisplayName(actor.name), amountCents: event.amountCents,
    } });
    await tx.auditLog.create({ data: { actorUserId: actor.id, actorName: staffDisplayName(actor.name), action: "DRIVER_CASH_RECEIVED", entityType: "PaymentEvent", entityId: paymentEventId, details: JSON.stringify({ handoverId: handover.id, amountCents: event.amountCents, driverId: event.actorUserId, shiftId: event.shiftId }) } });
    return handover;
  });
}
