import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, apiError } from "@/lib/api";
import { requireRoleApi } from "@/lib/auth";
import { getBusinessDate } from "@/lib/business-date";
import { db } from "@/lib/db";
import { pendingDriverCashCents } from "@/lib/cash-handover";

const openSchema = z.object({ openingBalanceCents: z.number().int().min(0).max(100_000_000), notes: z.string().trim().max(500).default("") });

async function shiftView(shift: { id: string; businessDate: string; status: string; openingBalanceCents: number; actualCashCents: number | null; discrepancyCents: number | null; openedByName: string; closedByName: string | null; openedAt: Date; closedAt: Date | null }) {
  const totals = await db.paymentEvent.groupBy({ by: ["type"], where: { shiftId: shift.id, method: "CASH" }, _sum: { amountCents: true } });
  const cashSalesCents = (totals.find((row) => row.type === "PAYMENT")?._sum.amountCents ?? 0) - (totals.find((row) => row.type === "REFUND")?._sum.amountCents ?? 0);
  // Closing already requires zero pending cash; avoid an extra query per historical shift.
  const pendingCashCents = shift.status === "OPEN" ? await pendingDriverCashCents(db, shift.id) : 0;
  return { ...shift, status: shift.status as "OPEN" | "CLOSED", cashSalesCents, pendingDriverCashCents: pendingCashCents, expectedCashCents: shift.openingBalanceCents + cashSalesCents, openedAt: shift.openedAt.toISOString(), closedAt: shift.closedAt?.toISOString() ?? null };
}

export async function GET() {
  try {
    if (!(await requireRoleApi(["ADMIN", "CASHIER"]))) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    const shifts = await db.cashRegisterShift.findMany({ orderBy: { openedAt: "desc" }, take: 30 });
    return NextResponse.json({ shifts: await Promise.all(shifts.map(shiftView)) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRoleApi(["ADMIN", "CASHIER"]);
    if (!session) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    if (await db.cashRegisterShift.findFirst({ where: { status: "OPEN" } })) return NextResponse.json({ error: "Ya existe una caja abierta." }, { status: 409 });
    const input = openSchema.parse(await request.json());
    const shift = await db.$transaction(async (transaction) => {
      const created = await transaction.cashRegisterShift.create({ data: { businessDate: getBusinessDate(), openingBalanceCents: input.openingBalanceCents, notes: input.notes, openedByUserId: session.id, openedByName: session.email } });
      await transaction.auditLog.create({ data: { actorUserId: session.id, actorName: session.name, action: "CASH_SHIFT_OPENED", entityType: "CashRegisterShift", entityId: created.id, details: JSON.stringify({ openingBalanceCents: input.openingBalanceCents }) } });
      return created;
    });
    return NextResponse.json({ shift: await shiftView(shift) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
