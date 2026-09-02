import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/deliveries/route";
import { PATCH } from "@/app/api/admin/deliveries/[id]/route";
import { GET as getStaff } from "@/app/api/admin/staff/route";
import { PATCH as payOrder } from "@/app/api/admin/orders/[id]/route";

const mocks = vi.hoisted(() => ({
  session: { id: "driver1", email: "driver@example.invalid", role: "DRIVER", canCollectCash: false },
  db: {
    customerOrder: { findMany: vi.fn(), findUniqueOrThrow: vi.fn(), updateMany: vi.fn() },
    adminUser: { findMany: vi.fn(), findFirst: vi.fn() },
    cashRegisterShift: { findFirst: vi.fn() },
    orderStatusHistory: { create: vi.fn() },
    auditLog: { create: vi.fn() },
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
  Object.assign(mocks.session, { id: "driver1", role: "DRIVER", canCollectCash: false });
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
});
