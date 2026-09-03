import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { confirmCashHandover, pendingDriverCashCents } from "@/lib/cash-handover";
import { GET, POST } from "@/app/api/admin/cash-handovers/route";
import { POST as correctPayment } from "@/app/api/admin/orders/[id]/refund/route";
import { PATCH as closeShift } from "@/app/api/admin/cash-shifts/[id]/route";

const mock = vi.hoisted(() => ({
  actor: { id: "cashier1", name: "Ana Cajera", email: "test@example.invalid", role: "CASHIER", canCollectCash: false },
  db: {
    paymentEvent: { findUnique: vi.fn(), findMany: vi.fn(), aggregate: vi.fn(), create: vi.fn(), updateMany: vi.fn(), groupBy: vi.fn() },
    driverCashHandover: { create: vi.fn(), findMany: vi.fn() },
    customerOrder: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
    cashRegisterShift: { findFirst: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    auditLog: { create: vi.fn() }, $transaction: vi.fn(), $queryRaw: vi.fn(),
  },
}));
vi.mock("@/lib/db", () => ({ db: mock.db }));
vi.mock("@/lib/auth", () => ({ requireRoleApi: async (roles: string[]) => roles.includes(mock.actor.role) ? mock.actor : null }));
const payment = { id: "payment1", orderId: 1, shiftId: "shift1", type: "PAYMENT", method: "CASH", cashCustody: "DRIVER", actorUserId: "driver1", actorName: "Luis Repartidor", amountCents: 1574, handover: null };
const order = { id: 1, version: 3, paymentStatus: "PAID", paymentMethod: "CASH", paymentEvents: [payment] };
const context = { params: Promise.resolve({ id: "1" }) };
function request(path: string, body: unknown, method = "POST", origin = "http://localhost") {
  return new NextRequest(`http://localhost${path}`, { method, headers: { origin, host: "localhost", "content-type": "application/json" }, body: JSON.stringify(body) });
}
const correction = (body: object) => correctPayment(request("/api/admin/orders/1/refund", { version: 3, reason: "Corrección verificada", ...body }), context);

beforeEach(() => {
  vi.resetAllMocks(); Object.assign(mock.actor, { id: "cashier1", role: "CASHIER", canCollectCash: false });
  mock.db.$transaction.mockImplementation(async (callback: (tx: typeof mock.db) => unknown) => callback(mock.db));
  mock.db.$queryRaw.mockResolvedValue([{ status: "OPEN" }]);
  mock.db.paymentEvent.findUnique.mockResolvedValue(payment);
  mock.db.paymentEvent.findMany.mockResolvedValue([]);
  mock.db.paymentEvent.aggregate.mockResolvedValue({ _sum: { amountCents: 0 }, _count: { _all: 0 } });
  mock.db.driverCashHandover.create.mockResolvedValue({ id: "handover1" });
  mock.db.driverCashHandover.findMany.mockResolvedValue([]);
  mock.db.customerOrder.findUnique.mockResolvedValue(order);
  mock.db.customerOrder.findUniqueOrThrow.mockResolvedValue(order);
  mock.db.cashRegisterShift.findFirst.mockResolvedValue({ id: "shift1" });
  mock.db.cashRegisterShift.findUnique.mockResolvedValue({ id: "shift1", status: "OPEN" });
});

describe("driver cash handovers (mocked database)", () => {
  it("hides irrelevant cash controls but retains access for permissions, pending cash or historical handovers", async () => {
    Object.assign(mock.actor, { id: "driver1", role: "DRIVER" });
    expect((await (await GET()).json()).visible).toBe(false);
    mock.actor.canCollectCash = true;
    expect((await (await GET()).json()).visible).toBe(true);
    mock.actor.canCollectCash = false;
    mock.db.paymentEvent.aggregate.mockResolvedValue({ _sum: { amountCents: 2898 }, _count: { _all: 1 } });
    expect((await (await GET()).json()).visible).toBe(true);
    mock.db.paymentEvent.aggregate.mockResolvedValue({ _sum: { amountCents: 0 }, _count: { _all: 0 } });
    mock.db.driverCashHandover.findMany.mockResolvedValue([{ id: "handover1", driverName: "Luis", receivedByName: "Ana", amountCents: 2898, createdAt: new Date(), paymentEvent: { order: { dailyNumber: 2, businessDate: "2026-09-02" } } }]);
    expect((await (await GET()).json()).visible).toBe(true);
  });
  it("records custody and audit without creating a second payment", async () => {
    await confirmCashHandover("payment1", mock.actor);
    expect(mock.db.driverCashHandover.create).toHaveBeenCalledWith({ data: { paymentEventId: "payment1", driverId: "driver1", driverName: "Luis Repartidor", receivedById: "cashier1", receivedByName: "Ana Cajera", amountCents: 1574 } });
    expect(mock.db.paymentEvent.create).not.toHaveBeenCalled();
    expect(mock.db.auditLog.create).toHaveBeenCalledOnce();
    expect(mock.db.$queryRaw.mock.calls[0][0].join("")).toContain('CashRegisterShift');
    expect(mock.db.$queryRaw.mock.calls[1][0].join("")).toContain('FOR UPDATE');
  });
  it("returns the existing confirmation even if a retried response arrives after closing", async () => {
    mock.db.paymentEvent.findUnique.mockResolvedValue({ ...payment, handover: { id: "handover1" } });
    mock.db.$queryRaw.mockResolvedValue([{ status: "CLOSED" }]);
    expect(await confirmCashHandover("payment1", mock.actor)).toEqual({ id: "handover1" });
    expect(mock.db.driverCashHandover.create).not.toHaveBeenCalled();
  });
  it.each([{ method: "CARD" }, { cashCustody: null }, { type: "REFUND" }, { shiftId: null }, { actorUserId: null }, { actorUserId: "cashier1" }])("rejects invalid or self-confirmed handovers: %j", async (fields) => {
    mock.db.paymentEvent.findUnique.mockResolvedValue({ ...payment, ...fields });
    await expect(confirmCashHandover("payment1", mock.actor)).rejects.toThrow();
    expect(mock.db.driverCashHandover.create).not.toHaveBeenCalled();
  });
  it("refuses an unconfirmed payment from a closed shift", async () => {
    mock.db.$queryRaw.mockResolvedValue([{ status: "CLOSED" }]);
    await expect(confirmCashHandover("payment1", mock.actor)).rejects.toThrow("cerrado");
  });
  it("requires cashier authority, same origin and explicit physical confirmation", async () => {
    const body = { paymentEventId: "payment1", confirmedReceived: true };
    mock.actor.role = "DRIVER";
    expect((await POST(request("/api/admin/cash-handovers", body))).status).toBe(403);
    mock.actor.role = "ADMIN";
    expect((await POST(request("/api/admin/cash-handovers", body, "POST", "https://other.invalid"))).status).toBe(403);
    expect((await POST(request("/api/admin/cash-handovers", { paymentEventId: "payment1" }))).status).toBe(400);
    expect((await POST(request("/api/admin/cash-handovers", body))).status).toBe(200);
  });
  it("scopes driver balances and history to the signed-in driver", async () => {
    Object.assign(mock.actor, { id: "driver1", role: "DRIVER" });
    const response = await GET(); expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mock.db.paymentEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ actorUserId: "driver1", cashCustody: "DRIVER", handover: { is: null } }) }));
    expect(mock.db.driverCashHandover.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { driverId: "driver1" } }));
    mock.actor.role = "KITCHEN"; expect((await GET()).status).toBe(403);
  });
  it("blocks closing until driver cash is confirmed, using only pending cash payments", async () => {
    mock.db.paymentEvent.aggregate.mockResolvedValue({ _sum: { amountCents: 1574 } });
    // Call through the API so the query uses the same transaction as the shift lock.
    const result = await closeShift(request("/api/admin/cash-shifts/shift1", { actualCashCents: 1574 }, "PATCH"), { params: Promise.resolve({ id: "shift1" }) });
    expect(result.status).toBe(409); expect(mock.db.cashRegisterShift.updateMany).not.toHaveBeenCalled();
    expect(await pendingDriverCashCents(mock.db as unknown as Parameters<typeof pendingDriverCashCents>[0], "shift1")).toBe(1574);
    expect(mock.db.paymentEvent.aggregate).toHaveBeenCalledWith({ where: { shiftId: "shift1", type: "PAYMENT", method: "CASH", cashCustody: "DRIVER", handover: { is: null } }, _sum: { amountCents: true } });
  });
});

describe("payment corrections (mocked database)", () => {
  it("locks the shift then order, records the refund once, and advances its version", async () => {
    expect((await correction({ action: "REFUND", amountCents: 500 })).status).toBe(200);
    expect(mock.db.$queryRaw.mock.calls[0][0].join("")).toContain("CashRegisterShift");
    expect(mock.db.$queryRaw.mock.calls[1][0].join("")).toContain("CustomerOrder");
    expect(mock.db.paymentEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ amountCents: 500, type: "REFUND", cashCustody: "REGISTER", shiftId: "shift1" }) });
    expect(mock.db.customerOrder.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { paymentStatus: "PARTIALLY_REFUNDED", version: { increment: 1 } } });
  });
  it("rejects stale retries without issuing a second refund", async () => {
    mock.db.customerOrder.findUniqueOrThrow.mockResolvedValue({ ...order, version: 4 });
    expect((await correction({ action: "REFUND", amountCents: 500 })).status).toBe(409);
    expect(mock.db.paymentEvent.create).not.toHaveBeenCalled();
  });
  it("rejects refunds above the remaining balance and cash without an open shift", async () => {
    expect((await correction({ action: "REFUND", amountCents: 2000 })).status).toBe(409);
    mock.db.cashRegisterShift.findFirst.mockResolvedValue(null);
    expect((await correction({ action: "REFUND", amountCents: 500 })).status).toBe(409);
    expect(mock.db.paymentEvent.create).not.toHaveBeenCalled();
  });
  it("marks a full refund and leaves driver-held cash pending for handover", async () => {
    expect((await correction({ action: "REFUND", amountCents: 1574 })).status).toBe(200);
    expect(mock.db.customerOrder.update).toHaveBeenCalledWith(expect.objectContaining({ data: { paymentStatus: "REFUNDED", version: { increment: 1 } } }));
    expect(mock.db.driverCashHandover.create).not.toHaveBeenCalled();
    expect(mock.db.paymentEvent.updateMany).not.toHaveBeenCalled();
  });
  it("does not rewrite a confirmed handover, refunded payment, or closed shift", async () => {
    mock.db.customerOrder.findUniqueOrThrow.mockResolvedValue({ ...order, paymentEvents: [{ ...payment, handover: { id: "h1" } }] });
    expect((await correction({ action: "CHANGE_METHOD", paymentMethod: "CARD" })).status).toBe(409);
    mock.db.customerOrder.findUniqueOrThrow.mockResolvedValue({ ...order, paymentEvents: [payment, { ...payment, id: "refund1", type: "REFUND", amountCents: 100 }] });
    expect((await correction({ action: "CHANGE_METHOD", paymentMethod: "CARD" })).status).toBe(409);
    mock.db.customerOrder.findUniqueOrThrow.mockResolvedValue(order); mock.db.$queryRaw.mockResolvedValue([{ status: "CLOSED" }]);
    expect((await correction({ action: "CHANGE_METHOD", paymentMethod: "CARD" })).status).toBe(409);
    expect(mock.db.paymentEvent.updateMany).not.toHaveBeenCalled();
  });
  it("requires physical receipt in the drawer to correct a noncash payment to cash", async () => {
    mock.db.customerOrder.findUniqueOrThrow.mockResolvedValue({ ...order, paymentMethod: "CARD", paymentEvents: [{ ...payment, method: "CARD", cashCustody: null }] });
    expect((await correction({ action: "CHANGE_METHOD", paymentMethod: "CASH" })).status).toBe(409);
    expect((await correction({ action: "CHANGE_METHOD", paymentMethod: "CASH", confirmedCashReceived: true })).status).toBe(200);
    expect(mock.db.paymentEvent.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { method: "CASH", cashCustody: "REGISTER", shiftId: "shift1" } }));
  });
  it("does not let drivers correct payments", async () => {
    mock.actor.role = "DRIVER";
    expect((await correction({ action: "REFUND", amountCents: 500 })).status).toBe(403);
    expect(mock.db.$transaction).not.toHaveBeenCalled();
  });
});
