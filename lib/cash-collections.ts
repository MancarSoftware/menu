import { db } from "./db";
import { getBusinessDateRange } from "./business-date";
import type { CashCollectionsView, CollectionTotals } from "./domain";
import { resolvePaymentActorNames } from "./payment-actors";

const PAGE_SIZE = 20;
const emptyTotals = (): CollectionTotals => ({ collectedCents: 0, refundsCents: 0, netCents: 0, paymentCount: 0 });

export async function getCashCollections(date: string, requestedPage: number): Promise<CashCollectionsView> {
  const { start, end } = getBusinessDateRange(date);
  // Collection date, not order date or shift date: the same ledger used by Sales.
  // Do not restrict shiftId: card/transfer payments may have no open cash shift.
  const where = { createdAt: { gte: start, lt: end }, type: { in: ["PAYMENT", "REFUND"] } };
  return db.$transaction(async (transaction) => {
    const grouped = await transaction.paymentEvent.groupBy({
      by: ["method", "type"], where, _sum: { amountCents: true }, _count: { _all: true },
    });
    const totals = emptyTotals();
    const methods = new Map(["CASH", "CARD", "TRANSFER"].map((method) => [method, { method, ...emptyTotals() }]));
    let totalEvents = 0;
    for (const row of grouped) {
      const method = methods.get(row.method) ?? { method: row.method, ...emptyTotals() };
      const amount = row._sum.amountCents ?? 0;
      for (const target of [totals, method]) {
        if (row.type === "PAYMENT") {
          target.collectedCents += amount;
          target.paymentCount += row._count._all;
        } else target.refundsCents += amount;
        target.netCents = target.collectedCents - target.refundsCents;
      }
      methods.set(row.method, method);
      totalEvents += row._count._all;
    }
    const totalPages = Math.max(1, Math.ceil(totalEvents / PAGE_SIZE));
    const page = Math.min(requestedPage, totalPages);
    const events = await transaction.paymentEvent.findMany({
      where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      select: {
        id: true, type: true, method: true, amountCents: true, actorUserId: true, actorName: true, createdAt: true,
        order: { select: { id: true, dailyNumber: true, businessDate: true, mode: true } },
        shift: { select: { id: true, businessDate: true, openedAt: true, status: true } },
      },
    });
    const actorNames = await resolvePaymentActorNames(events, transaction);
    return {
      date, totals, methods: [...methods.values()], page, pageSize: PAGE_SIZE, totalPages, totalEvents,
      events: events.map((event) => ({
        id: event.id, type: event.type, method: event.method, amountCents: event.amountCents,
        actorName: actorNames.get(event.id)!, createdAt: event.createdAt.toISOString(),
        order: { id: event.order.id, orderNumber: event.order.dailyNumber, businessDate: event.order.businessDate, mode: event.order.mode },
        shift: event.shift ? { ...event.shift, openedAt: event.shift.openedAt.toISOString() } : null,
      })),
    };
  }, { isolationLevel: "RepeatableRead" });
}
