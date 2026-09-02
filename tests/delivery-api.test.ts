import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/deliveries/route";
import { PATCH } from "@/app/api/admin/deliveries/[id]/route";
import { GET as getStaff } from "@/app/api/admin/staff/route";
import { PATCH as payOrder } from "@/app/api/admin/orders/[id]/route";
import { getAdminMetrics } from "@/lib/menu-repository";
import { GET as getCashShifts } from "@/app/api/admin/cash-shifts/route";

const mocks = vi.hoisted(() => ({
  session: { id: "driver1", name: "Test Driver", canCollectCard: false, canCollectTransfer: false, email: "driver@example.invalid", role: "DRIVER", canCollectCash: false },
  db: {
    customerOrder: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn(), findUniqueOrThrow: vi.fn(), updateMany: vi.fn() },
    adminUser: { findMany: vi.fn(), findFirst: vi.fn() },
    cashRegisterShift: { findFirst: vi.fn(), findMany: vi.fn() },
    orderStatusHistory: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    paymentEvent: { create: vi.fn(), groupBy: vi.fn() },
    $queryRaw: vi.fn(), $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/auth", () => ({ requireRoleApi: vi.fn(async (roles: string[]) => roles.includes(mocks.session.role) ? mocks.session : null) }));
vi.mock("@/lib/order-serializers", () => ({ orderInclude: {}, toOrderView: (order: unknown) => order }));

const current = { id: 4, mode: "DELIVERY", status: "READY", deliveryStatus: "PENDING", assignedDriverId: "driver1", version: 3 };
const request = (body: unknown) => new NextRequest("http://localhost:3000/api/admin/deliveries/4", { method: "PATCH", headers: { origin: "http://localhost:3000", host: "localhost:3000", "content-type": "application/json" }, body: JSON.stringify(body) });
const context = { params: Promise.resolve({ id: "4" }) };

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(mocks.session, { id: "driver1", role: "DRIVER", canCollectCash: false, canCollectCard: false, canCollectTransfer: false });
  mocks.db.customerOrder.findMany.mockResolvedValue([]);
  mocks.db.customerOrder.findUniqueOrThrow.mockResolvedValue(current);
  mocks.db.customerOrder.updateMany.mockResolvedValue({ count: 1 });
  mocks.db.adminUser.findMany.mockResolvedValue([]);
  mocks.db.adminUser.findFirst.mockResolvedValue({ id: "driver1", role: "DRIVER", isActive: true });
  mocks.db.$transaction.mockImplementation(async (callback: (db: typeof mocks.db) => unknown) => callback(mocks.db));
});

describe("delivery API boundaries (database mocked)", () => {
  it("only queries the driver's own active delivery orders", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mocks.db.customerOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ assignedDriverId: "driver1", mode: "DELIVERY", status: { notIn: ["PAID", "CANCELLED"] } }) }));
    expect(mocks.db.adminUser.findMany).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("does not expose the delivery feed to kitchen staff", async () => {
    mocks.session.role = "KITCHEN";
    expect((await GET()).status).toBe(403);
    expect(mocks.db.customerOrder.findMany).not.toHaveBeenCalled();
  });
  it("refuses driver self-assignment and modifications of someone else's order", async () => {
    expect((await PATCH(request({ action: "ASSIGN", driverId: "driver1", version: 3 }), context)).status).toBe(409);
    mocks.db.customerOrder.findUniqueOrThrow.mockResolvedValue({ ...current, assignedDriverId: "other" });
    expect((await PATCH(request({ action: "DISPATCH", version: 3 }), context)).status).toBe(409);
    expect(mocks.db.customerOrder.updateMany).not.toHaveBeenCalled();
  });
  it("rejects inactive drivers before assignment", async () => {
    mocks.session.role = "ADMIN";
    mocks.db.adminUser.findFirst.mockResolvedValue(null);
    expect((await PATCH(request({ action: "ASSIGN", driverId: "driver1", version: 3 }), context)).status).toBe(409);
    expect(mocks.db.customerOrder.updateMany).not.toHaveBeenCalled();
  });
  it("uses version and ownership guards for departure without marking the order paid", async () => {
    expect((await PATCH(request({ action: "DISPATCH", version: 3 }), context)).status).toBe(200);
    const args = mocks.db.customerOrder.updateMany.mock.calls[0][0];
    expect(args.where).toMatchObject({ id: 4, version: 3, assignedDriverId: "driver1", deliveryStatus: "PENDING" });
    expect(args.data.deliveryStatus).toBe("OUT_FOR_DELIVERY");
    expect(args.data.paymentStatus).toBeUndefined();
    expect(args.data.status).toBeUndefined();
    expect(mocks.db.auditLog.create).toHaveBeenCalled();
  });
  it("returns a conflict for a stale update and does not write history", async () => {
    mocks.db.customerOrder.updateMany.mockResolvedValue({ count: 0 });
    expect((await PATCH(request({ action: "DISPATCH", version: 2 }), context)).status).toBe(409);
    expect(mocks.db.auditLog.create).not.toHaveBeenCalled();
  });
  it("completes the delivery and records its history", async () => {
    mocks.db.customerOrder.findUniqueOrThrow.mockResolvedValue({ ...current, deliveryStatus: "OUT_FOR_DELIVERY" });
    expect((await PATCH(request({ action: "DELIVER", version: 3 }), context)).status).toBe(200);
    expect(mocks.db.customerOrder.updateMany.mock.calls[0][0].data).toMatchObject({ status: "SERVED", deliveryStatus: "DELIVERED" });
    expect(mocks.db.orderStatusHistory.create).toHaveBeenCalledWith({ data: { orderId: 4, status: "SERVED", actor: mocks.session.email } });
  });
  it("blocks unprivileged cash collection and requires an open register even for authorized drivers", async () => {
    mocks.db.customerOrder.findUniqueOrThrow.mockResolvedValue({ ...current, status: "SERVED", deliveryStatus: "DELIVERED" });
    expect((await payOrder(request({ status: "PAID", paymentMethod: "CASH", version: 3 }), context)).status).toBe(403);
    mocks.session.canCollectCash = true;
    mocks.db.cashRegisterShift.findFirst.mockResolvedValue(null);
    expect((await payOrder(request({ status: "PAID", paymentMethod: "CASH", version: 3 }), context)).status).toBe(409);
    expect(mocks.db.customerOrder.updateMany).not.toHaveBeenCalled();
  });
  it("prevents the kitchen status API from bypassing delivery confirmation", async () => {
    mocks.session.role = "ADMIN";
    expect((await payOrder(request({ status: "SERVED", version: 3 }), context)).status).toBe(409);
    expect(mocks.db.customerOrder.updateMany).not.toHaveBeenCalled();
  });
  it("never serializes staff password hashes", async () => {
    mocks.session.role = "ADMIN";
    mocks.db.adminUser.findMany.mockResolvedValue([{ id: "driver1", email: "driver@example.invalid", name: "Driver", role: "DRIVER", isActive: true, canCollectCash: false, mustChangePassword: true, lastLoginAt: null, passwordHash: "never-return-this-hash" }]);
    const body = await (await getStaff()).json();
    expect(body.users[0].role).toBe("DRIVER");
    expect(JSON.stringify(body)).not.toContain("passwordHash");
    expect(JSON.stringify(body)).not.toContain("never-return-this-hash");
  });
  it.each(["CASH", "CARD", "TRANSFER"])("records an authorized driver's %s collection once in the revenue ledger, using their name", async (method) => {
    mocks.session.canCollectCash = true; mocks.session.canCollectCard = true; mocks.session.canCollectTransfer = true;
    mocks.db.customerOrder.findUniqueOrThrow.mockResolvedValue({ ...current, status: "SERVED", deliveryStatus: "DELIVERED", totalCents: 1574, diningTableId: null });
    mocks.db.cashRegisterShift.findFirst.mockResolvedValue({ id: "shift1" });
    mocks.db.$queryRaw.mockResolvedValue([{ status: "OPEN" }]);
    expect((await payOrder(request({ status: "PAID", paymentMethod: method, version: 3 }), context)).status).toBe(200);
    const event = mocks.db.paymentEvent.create.mock.calls[0][0].data;
    expect(event).toMatchObject({ type: "PAYMENT", method, amountCents: 1574, actorName: "Test Driver", actorUserId: "driver1", shiftId: "shift1" });
    expect(JSON.stringify(event)).not.toContain("@");
    mocks.db.paymentEvent.groupBy.mockResolvedValue([{ type: "PAYMENT", _sum: { amountCents: event.amountCents }, _count: { _all: 1 } }]);
    const metrics = await getAdminMetrics("2026-09-02");
    expect(metrics).toEqual({ date: "2026-09-02", revenueCents: 1574, paidOrderCount: 1 });
    expect(mocks.db.paymentEvent.groupBy.mock.calls[0][0].where.createdAt.gte.toISOString()).toBe("2026-09-02T05:00:00.000Z");
    mocks.db.customerOrder.updateMany.mockResolvedValue({ count: 0 });
    expect((await payOrder(request({ status: "PAID", paymentMethod: method, version: 3 }), context)).status).toBe(409);
    expect(mocks.db.paymentEvent.create).toHaveBeenCalledTimes(1);
  });
  it("does not expand existing cash-only permission to card or transfer", async () => {
    mocks.session.canCollectCash = true;
    mocks.db.customerOrder.findUniqueOrThrow.mockResolvedValue({ ...current, status: "SERVED", deliveryStatus: "DELIVERED" });
    expect((await payOrder(request({ status: "PAID", paymentMethod: "CARD", version: 3 }), context)).status).toBe(403);
    expect((await payOrder(request({ status: "PAID", paymentMethod: "TRANSFER", version: 3 }), context)).status).toBe(403);
    expect(mocks.db.paymentEvent.create).not.toHaveBeenCalled();
  });
  it("rejects a collection if its cash shift closed before the transaction acquired its lock", async () => {
    mocks.session.canCollectCash = true;
    mocks.db.customerOrder.findUniqueOrThrow.mockResolvedValue({ ...current, status: "SERVED", deliveryStatus: "DELIVERED", totalCents: 1574 });
    mocks.db.cashRegisterShift.findFirst.mockResolvedValue({ id: "shift1" });
    mocks.db.$queryRaw.mockResolvedValue([{ status: "CLOSED" }]);
    expect((await payOrder(request({ status: "PAID", paymentMethod: "CASH", version: 3 }), context)).status).toBe(409);
    expect(mocks.db.customerOrder.updateMany).not.toHaveBeenCalled();
    expect(mocks.db.paymentEvent.create).not.toHaveBeenCalled();
  });
  it("includes driver cash in register totals without filtering by collector or including noncash", async () => {
    mocks.session.role = "CASHIER";
    mocks.db.cashRegisterShift.findMany.mockResolvedValue([{ id: "shift1", businessDate: "2026-09-02", status: "OPEN", openingBalanceCents: 2000, actualCashCents: null, discrepancyCents: null, openedByName: "Caja", closedByName: null, openedAt: new Date(), closedAt: null }]);
    mocks.db.paymentEvent.groupBy.mockResolvedValue([{ type: "PAYMENT", _sum: { amountCents: 1574 } }]);
    const result = await (await getCashShifts()).json();
    expect(mocks.db.paymentEvent.groupBy.mock.calls[0][0].where).toEqual({ shiftId: "shift1", method: "CASH" });
    expect(result.shifts[0]).toMatchObject({ cashSalesCents: 1574, expectedCashCents: 3574 });
  });
  it("keeps history restricted to the driver and includes paid deliveries with date and pagination", async () => {
    expect((await GET(new Request("http://localhost/api/admin/deliveries?view=history&date=2026-09-02&page=2"))).status).toBe(200);
    const args = mocks.db.customerOrder.findMany.mock.calls[0][0];
    expect(args).toMatchObject({ take: 20, skip: 20, where: { mode: "DELIVERY", assignedDriverId: "driver1", deliveryStatus: "DELIVERED", status: { not: "CANCELLED" } } });
    expect(args.where.OR[0].deliveredAt.gte.toISOString()).toBe("2026-09-02T05:00:00.000Z");
  });
});
