import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireRoleApi } from "@/lib/auth";
import { getBusinessDate, getBusinessDateRange, isBusinessDate } from "@/lib/business-date";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    if (!(await requireRoleApi(["ADMIN", "CASHIER"]))) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    const params = request.nextUrl.searchParams;
    const from = params.get("from") ?? getBusinessDate();
    const to = params.get("to") ?? from;
    if (!isBusinessDate(from) || !isBusinessDate(to) || from > to) return NextResponse.json({ error: "Rango de fechas inválido." }, { status: 400 });
    const start = getBusinessDateRange(from).start;
    const end = getBusinessDateRange(to).end;
    const events = await db.paymentEvent.findMany({ where: { createdAt: { gte: start, lt: end } }, orderBy: { createdAt: "asc" } });
    const pointMap = new Map<string, { revenueCents: number; paymentCount: number }>();
    let revenueCents = 0; let refundsCents = 0; let paymentCount = 0;
    for (const event of events) {
      const label = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil", year: "numeric", month: "2-digit", day: "2-digit" }).format(event.createdAt);
      const point = pointMap.get(label) ?? { revenueCents: 0, paymentCount: 0 };
      if (event.type === "PAYMENT") { revenueCents += event.amountCents; paymentCount += 1; point.revenueCents += event.amountCents; point.paymentCount += 1; }
      if (event.type === "REFUND") { refundsCents += event.amountCents; point.revenueCents -= event.amountCents; }
      pointMap.set(label, point);
    }
    return NextResponse.json({ report: { from, to, revenueCents, refundsCents, netRevenueCents: revenueCents - refundsCents, paymentCount, points: [...pointMap].map(([label, value]) => ({ label, ...value })) } });
  } catch (error) { return apiError(error); }
}
