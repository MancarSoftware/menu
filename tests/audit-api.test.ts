import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/admin/audit/route";
const mock = vi.hoisted(() => ({ allowed: true, db: { auditLog: { findMany: vi.fn(), count: vi.fn() }, paymentEvent: { findMany: vi.fn() }, customerOrder: { findMany: vi.fn() }, adminUser: { findMany: vi.fn() } } }));
vi.mock("@/lib/db", () => ({ db: mock.db }));
vi.mock("@/lib/auth", () => ({ requireRoleApi: vi.fn(async (roles: string[]) => mock.allowed && roles.includes("ADMIN") ? { id: "admin" } : null) }));
const event = { id: "event1", action: "ORDER_PAYMENT_RECORDED", actorUserId: "driver", actorName: "driver@example.invalid", entityType: "CustomerOrder", entityId: "42", createdAt: new Date("2026-09-03T01:00:00Z"), details: JSON.stringify({ password: "never-return", email: "driver@example.invalid" }) };
beforeEach(() => {
  vi.clearAllMocks(); mock.allowed = true;
  mock.db.auditLog.findMany.mockResolvedValue([event]); mock.db.auditLog.count.mockResolvedValue(26);
  mock.db.paymentEvent.findMany.mockResolvedValue([]);
  mock.db.customerOrder.findMany.mockResolvedValue([{ id: 42, dailyNumber: 2, businessDate: "2026-09-02", totalCents: 2898 }]);
  mock.db.adminUser.findMany.mockResolvedValue([{ id: "driver", name: "Luis Repartidor" }]);
});
const get = (query = "") => GET(new Request(`http://localhost/api/admin/audit${query}`));
describe("audit API (mocked database)", () => {
  it("denies nonadministrators before querying data", async () => {
    mock.allowed = false; expect((await get()).status).toBe(403); expect(mock.db.auditLog.findMany).not.toHaveBeenCalled();
  });
  it.each(["?from=2026-02-30", "?from=2026-09-03&to=2026-09-02", "?page=0", "?page=1.5", "?orderId=-1", "?action=bad!"])("validates filters %s", async (query) => {
    expect((await get(query)).status).toBe(400); expect(mock.db.auditLog.findMany).not.toHaveBeenCalled();
  });
  it("applies Ecuador date boundaries, actor/activity filters and bounded pagination", async () => {
    const response = await get("?from=2026-09-02&to=2026-09-02&actorId=driver&action=ORDER_PAYMENT_RECORDED&page=2");
    expect(response.headers.get("cache-control")).toContain("no-store");
    const args = mock.db.auditLog.findMany.mock.calls[0][0];
    expect(args).toMatchObject({ take: 25, skip: 25, where: { actorUserId: "driver", action: "ORDER_PAYMENT_RECORDED" } });
    expect(args.where.createdAt.gte.toISOString()).toBe("2026-09-02T05:00:00.000Z");
    expect(args.where.createdAt.lt.toISOString()).toBe("2026-09-03T05:00:00.000Z");
    const body = await response.json(); expect(body.totalPages).toBe(2);
    expect(body.entries[0].summary).toContain("$28,98");
    expect(JSON.stringify(body)).not.toContain("@"); expect(JSON.stringify(body)).not.toContain("never-return");
  });
  it("includes linked handover/payment records in an order's complete history", async () => {
    mock.db.paymentEvent.findMany.mockResolvedValue([{ id: "payment1", amountCents: 2898, order: { id: 42, dailyNumber: 2, businessDate: "2026-09-02" } }]);
    mock.db.auditLog.findMany.mockResolvedValue([{ ...event, entityType: "PaymentEvent", entityId: "payment1", action: "DRIVER_CASH_RECEIVED" }]);
    const body = await (await get("?orderId=42")).json();
    expect(mock.db.auditLog.findMany.mock.calls[0][0].where.OR).toEqual([{ entityType: "CustomerOrder", entityId: "42" }, { entityType: "PaymentEvent", entityId: { in: ["payment1"] } }]);
    expect(body.entries[0].order).toEqual({ id: 42, orderNumber: 2, businessDate: "2026-09-02" });
  });
});
