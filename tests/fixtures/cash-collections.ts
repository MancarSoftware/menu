import type { CashCollectionsView, CashShiftView } from "@/lib/domain";

export const cashShift: CashShiftView = {
  id: "test-shift-01", businessDate: "2026-09-01", status: "OPEN", openingBalanceCents: 2000,
  pendingDriverCashCents: 0, cashSalesCents: 3074, expectedCashCents: 5074, actualCashCents: null, discrepancyCents: null,
  openedByName: "Ana Cajera", closedByName: null, openedAt: "2026-09-02T03:00:00.000Z", closedAt: null,
};

export function collectionFixture(date = "2026-09-02"): CashCollectionsView {
  return {
    date, page: 1, pageSize: 20, totalPages: 2, totalEvents: 21,
    totals: { collectedCents: 9074, refundsCents: 750, netCents: 8324, paymentCount: 19 },
    methods: [
      { method: "CASH", collectedCents: 3574, refundsCents: 500, netCents: 3074, paymentCount: 17 },
      { method: "CARD", collectedCents: 2500, refundsCents: 250, netCents: 2250, paymentCount: 1 },
      { method: "TRANSFER", collectedCents: 3000, refundsCents: 0, netCents: 3000, paymentCount: 1 },
    ],
    events: [
      { id: "cash-01", type: "PAYMENT", method: "CASH", amountCents: 1574, actorName: "Ana Repartidora", createdAt: `${date}T05:10:00.000Z`, order: { id: 42, orderNumber: 1, businessDate: "2026-09-01", mode: "DELIVERY" }, shift: { id: cashShift.id, status: "OPEN", openedAt: cashShift.openedAt, businessDate: cashShift.businessDate } },
      { id: "card-01", type: "PAYMENT", method: "CARD", amountCents: 2500, actorName: "Juan Cajero", createdAt: `${date}T05:09:00.000Z`, order: { id: 43, orderNumber: 2, businessDate: date, mode: "PICKUP" }, shift: null },
      { id: "refund-01", type: "REFUND", method: "CASH", amountCents: 500, actorName: "Ana Cajera", createdAt: `${date}T05:08:00.000Z`, order: { id: 44, orderNumber: 3, businessDate: date, mode: "DINE_IN" }, shift: { id: cashShift.id, status: "OPEN", openedAt: cashShift.openedAt, businessDate: cashShift.businessDate } },
    ],
  };
}
