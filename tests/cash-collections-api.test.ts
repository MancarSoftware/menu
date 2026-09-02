import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/cash-collections/route";
import { GET as getRevenue } from "@/app/api/admin/reports/revenue/route";
import { GET as getShifts } from "@/app/api/admin/cash-shifts/route";
import { PATCH as closeShift } from "@/app/api/admin/cash-shifts/[id]/route";

const mocks = vi.hoisted(() => ({
  role: "ADMIN",
  db: {
    paymentEvent: { aggregate: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
    adminUser: { findMany: vi.fn() },
    cashRegisterShift: { findMany: vi.fn(), findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(), $queryRaw: vi.fn(),
  },
}));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/auth", () => ({ requireRoleApi: async (roles: string[]) => roles.includes(mocks.role) ? { id: "cashier", role: mocks.role, email: "cashier@example.invalid" } : null }));

const shift = { id: "shift1", status: "OPEN", businessDate: "2026-09-01", openingBalanceCents: 2000, openedAt: new Date("2026-09-02T03:00:00Z"), closedAt: null };
const event = (id: string, method: string, amountCents: number, type = "PAYMENT", assigned = true) => ({
  id, method, type, amountCents, actorUserId: "driver1", actorName: "driver@example.invalid", createdAt: new Date("2026-09-02T05:10:00Z"),
  order: { id: 42, dailyNumber: 1, businessDate: "2026-09-01", mode: "DELIVERY" }, shift: assigned ? shift : null,
});
const records = [event("cash1", "CASH", 1574), event("local1", "CASH", 2000), event("card1", "CARD", 2500, "PAYMENT", false), event("transfer1", "TRANSFER", 3000, "PAYMENT", false), event("refund1", "CASH", 500, "REFUND"), event("refund2", "CARD", 250, "REFUND", false)];
const request = (query = "date=2026-09-02") => new NextRequest(`http://localhost/api/admin/cash-collections?${query}`);

beforeEach(() => {
  vi.clearAllMocks(); mocks.role = "ADMIN"; mocks.db.paymentEvent.aggregate.mockResolvedValue({ _sum: { amountCents: 0 } });
  mocks.db.$transaction.mockImplementation(async (run: (db: typeof mocks.db) => unknown) => run(mocks.db));
  mocks.db.paymentEvent.groupBy.mockResolvedValue(records.map((row) => ({ type: row.type, method: row.method, _sum: { amountCents: row.amountCents }, _count: { _all: 1 } })));
  mocks.db.paymentEvent.findMany.mockResolvedValue(records);
  mocks.db.adminUser.findMany.mockResolvedValue([{ id: "driver1", name: "Ana Repartidora", email: "driver@example.invalid" }]);
});

describe("cash collection ledger (mocked database)", () => {
  it("includes local and driver collections, all methods and unassigned payments exactly once", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const { collections } = await response.json();
    expect(collections.totals).toEqual({ collectedCents: 9074, refundsCents: 750, netCents: 8324, paymentCount: 4 });
    expect(collections.methods).toEqual([
      { method: "CASH", collectedCents: 3574, refundsCents: 500, netCents: 3074, paymentCount: 2 },
      { method: "CARD", collectedCents: 2500, refundsCents: 250, netCents: 2250, paymentCount: 1 },
      { method: "TRANSFER", collectedCents: 3000, refundsCents: 0, netCents: 3000, paymentCount: 1 },
    ]);
    expect(collections.events.find((row: { id: string }) => row.id === "card1").shift).toBeNull();
    expect(mocks.db.paymentEvent.groupBy.mock.calls[0][0].where).toEqual({ type: { in: ["PAYMENT", "REFUND"] }, createdAt: { gte: new Date("2026-09-02T05:00:00Z"), lt: new Date("2026-09-03T05:00:00Z") } });
    expect(mocks.db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" });
    expect(collections.events[0].order).toEqual({ id: 42, orderNumber: 1, businessDate: "2026-09-01", mode: "DELIVERY" });
  });
  it("matches Sales from the same payment/refund events, not the order or shift date", async () => {
    const { collections } = await (await GET(request())).json();
    const { report } = await (await getRevenue(new NextRequest("http://localhost/api/admin/reports/revenue?from=2026-09-02&to=2026-09-02"))).json();
    expect(collections.totals).toEqual({ collectedCents: report.revenueCents, refundsCents: report.refundsCents, netCents: report.netRevenueCents, paymentCount: report.paymentCount });
  });
  it("returns names, never legacy collector emails or private user IDs", async () => {
    const body = await (await GET(request())).json();
    expect(body.collections.events[0].actorName).toBe("Ana Repartidora");
    expect(JSON.stringify(body)).not.toContain("@");
    expect(JSON.stringify(body)).not.toContain("actorUserId");
    mocks.db.adminUser.findMany.mockResolvedValue([]);
    expect((await (await GET(request())).json()).collections.events[0].actorName).toBe("Personal del local");
  });
  it("preserves recorded names without a staff lookup and keeps orphan cash visible", async () => {
    mocks.db.paymentEvent.findMany.mockResolvedValue([{ ...event("legacyCash", "CASH", 1000, "PAYMENT", false), actorName: "Nombre original" }]);
    const { collections } = await (await GET(request())).json();
    expect(collections.events[0]).toMatchObject({ actorName: "Nombre original", method: "CASH", shift: null });
    expect(mocks.db.adminUser.findMany).not.toHaveBeenCalled();
  });
  it("paginates only the history and clamps pages without reducing totals", async () => {
    mocks.db.paymentEvent.groupBy.mockResolvedValue([{ type: "PAYMENT", method: "CASH", _sum: { amountCents: 4100 }, _count: { _all: 41 } }]);
    mocks.db.paymentEvent.findMany.mockResolvedValue([event("last", "CASH", 100)]);
    const { collections } = await (await GET(request("date=2026-09-02&page=99"))).json();
    expect(collections).toMatchObject({ page: 3, pageSize: 20, totalPages: 3, totalEvents: 41, totals: { collectedCents: 4100 } });
    expect(mocks.db.paymentEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 40, take: 20, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }));
  });
  it("returns zero totals for an empty day", async () => {
    mocks.db.paymentEvent.groupBy.mockResolvedValue([]); mocks.db.paymentEvent.findMany.mockResolvedValue([]);
    const { collections } = await (await GET(request())).json();
    expect(collections).toMatchObject({ page: 1, totalPages: 1, totalEvents: 0, events: [], totals: { collectedCents: 0, refundsCents: 0, netCents: 0, paymentCount: 0 } });
  });
  it.each(["DRIVER", "WAITER", "KITCHEN", ""]) ("denies the %s role before querying collections", async (role) => {
    mocks.role = role;
    expect((await GET(request())).status).toBe(403);
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
  it("allows cashiers", async () => { mocks.role = "CASHIER"; expect((await GET(request())).status).toBe(200); });
  it.each(["date=2026-02-30", "date=invalid", "date=2026-09-02&page=0", "date=2026-09-02&page=-1", "date=2026-09-02&page=1.2", "date=2026-09-02&page=1e3", "date=2026-09-02&page=9007199254740992"])("rejects malformed query %s", async (query) => {
    expect((await GET(request(query))).status).toBe(400);
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
  it("keeps register reconciliation cash-only and tied to its shift across midnight", async () => {
    mocks.db.cashRegisterShift.findMany.mockResolvedValue([shift]);
    mocks.db.cashRegisterShift.findUnique.mockResolvedValue(shift);
    mocks.db.cashRegisterShift.findUniqueOrThrow.mockResolvedValue({ ...shift, status: "CLOSED" });
    mocks.db.cashRegisterShift.updateMany.mockResolvedValue({ count: 1 });
    mocks.db.paymentEvent.groupBy.mockResolvedValue([{ type: "PAYMENT", _sum: { amountCents: 3574 } }, { type: "REFUND", _sum: { amountCents: 500 } }]);
    const { shifts } = await (await getShifts()).json();
    expect(shifts[0]).toMatchObject({ cashSalesCents: 3074, expectedCashCents: 5074 });
    const response = await closeShift(new NextRequest("http://localhost/api/admin/cash-shifts/shift1", { method: "PATCH", headers: { origin: "http://localhost", host: "localhost" }, body: JSON.stringify({ actualCashCents: 5074 }) }), { params: Promise.resolve({ id: "shift1" }) });
    expect(response.status).toBe(200);
    for (const [args] of mocks.db.paymentEvent.groupBy.mock.calls) expect(args.where).toEqual({ shiftId: "shift1", method: "CASH" });
    expect(mocks.db.cashRegisterShift.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ expectedCashCents: 5074, discrepancyCents: 0 }) }));
  });
});
