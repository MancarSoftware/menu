import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, apiError } from "@/lib/api";
import { requireRoleApi } from "@/lib/auth";
import { db } from "@/lib/db";

const closeSchema = z.object({ actualCashCents: z.number().int().min(0).max(100_000_000), notes: z.string().trim().max(500).default("") });

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRoleApi(["ADMIN", "CASHIER"]);
    if (!session) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const { id } = await context.params;
    const input = closeSchema.parse(await request.json());
    const shift = await db.cashRegisterShift.findUnique({ where: { id } });
    if (!shift || shift.status !== "OPEN") return NextResponse.json({ error: "La caja ya está cerrada o no existe." }, { status: 409 });
    const totals = await db.paymentEvent.groupBy({ by: ["type"], where: { shiftId: id, method: "CASH" }, _sum: { amountCents: true } });
    const cashSalesCents = (totals.find((row) => row.type === "PAYMENT")?._sum.amountCents ?? 0) - (totals.find((row) => row.type === "REFUND")?._sum.amountCents ?? 0);
    const expectedCashCents = shift.openingBalanceCents + cashSalesCents;
    const discrepancyCents = input.actualCashCents - expectedCashCents;
    const updated = await db.$transaction(async (transaction) => {
      const changed = await transaction.cashRegisterShift.updateMany({ where: { id, status: "OPEN" }, data: { status: "CLOSED", expectedCashCents, actualCashCents: input.actualCashCents, discrepancyCents, closedAt: new Date(), closedByUserId: session.id, closedByName: session.email, notes: input.notes || shift.notes } });
      if (changed.count !== 1) throw new Error("SHIFT_CONFLICT");
      await transaction.auditLog.create({ data: { actorUserId: session.id, actorName: session.email, action: "CASH_SHIFT_CLOSED", entityType: "CashRegisterShift", entityId: id, details: JSON.stringify({ expectedCashCents, actualCashCents: input.actualCashCents, discrepancyCents }) } });
      return transaction.cashRegisterShift.findUniqueOrThrow({ where: { id } });
    });
    return NextResponse.json({ shift: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "SHIFT_CONFLICT") return NextResponse.json({ error: "Otra persona cerró esta caja." }, { status: 409 });
    return apiError(error);
  }
}
