import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, apiError } from "@/lib/api";
import { requireRoleApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { pendingDriverCashCents } from "@/lib/cash-handover";

const closeSchema = z.object({ actualCashCents: z.number().int().min(0).max(100_000_000), notes: z.string().trim().max(500).default("") });

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRoleApi(["ADMIN", "CASHIER"]);
    if (!session) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const { id } = await context.params;
    const input = closeSchema.parse(await request.json());
    const updated = await db.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "CashRegisterShift" WHERE "id" = ${id} FOR UPDATE`;
      const shift = await transaction.cashRegisterShift.findUnique({ where: { id } });
      if (!shift || shift.status !== "OPEN") throw new Error("SHIFT_CONFLICT");
      if (await pendingDriverCashCents(transaction, id) > 0) throw new Error("DRIVER_CASH_PENDING");
      const totals = await transaction.paymentEvent.groupBy({ by: ["type"], where: { shiftId: id, method: "CASH" }, _sum: { amountCents: true } });
      const cashSalesCents = (totals.find((row) => row.type === "PAYMENT")?._sum.amountCents ?? 0) - (totals.find((row) => row.type === "REFUND")?._sum.amountCents ?? 0);
      const expectedCashCents = shift.openingBalanceCents + cashSalesCents;
      const discrepancyCents = input.actualCashCents - expectedCashCents;
      const changed = await transaction.cashRegisterShift.updateMany({ where: { id, status: "OPEN" }, data: { status: "CLOSED", expectedCashCents, actualCashCents: input.actualCashCents, discrepancyCents, closedAt: new Date(), closedByUserId: session.id, closedByName: session.email, notes: input.notes || shift.notes } });
      if (changed.count !== 1) throw new Error("SHIFT_CONFLICT");
      await transaction.auditLog.create({ data: { actorUserId: session.id, actorName: session.email, action: "CASH_SHIFT_CLOSED", entityType: "CashRegisterShift", entityId: id, details: JSON.stringify({ expectedCashCents, actualCashCents: input.actualCashCents, discrepancyCents }) } });
      return transaction.cashRegisterShift.findUniqueOrThrow({ where: { id } });
    });
    return NextResponse.json({ shift: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "DRIVER_CASH_PENDING") return NextResponse.json({ error: "Hay efectivo pendiente de entrega por repartidores. Caja debe confirmar su recepción antes del cierre." }, { status: 409 });
    if (error instanceof Error && error.message === "SHIFT_CONFLICT") return NextResponse.json({ error: "Otra persona cerró esta caja." }, { status: 409 });
    return apiError(error);
  }
}
