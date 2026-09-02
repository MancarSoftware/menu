import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { confirmCashHandover } from "@/lib/cash-handover";
import { POST as refund } from "@/app/api/admin/orders/[id]/refund/route";
import { PATCH as closeShift } from "@/app/api/admin/cash-shifts/[id]/route";

if (process.env.ALLOW_DATABASE_TESTS !== "1") throw new Error("Use the guarded disposable-database runner.");
const actor = vi.hoisted(() => ({ id: "qa-cash-concurrency", name: "QA Cashier", role: "CASHIER", email: "qa@example.invalid" }));
// Only authentication is mocked; monetary persistence/locks use real PostgreSQL.
vi.mock("@/lib/auth", () => ({ requireRoleApi: async () => actor }));

let shiftId: string | undefined;
const orderIds: number[] = [];
function request(body: unknown) {
  return new NextRequest("http://localhost/api/admin/orders/1/refund", { method: "POST", headers: { origin: "http://localhost", host: "localhost", "content-type": "application/json" }, body: JSON.stringify(body) });
}
beforeAll(async () => {
  actor.id = `qa-cash-${randomUUID()}`;
  if (await db.cashRegisterShift.findFirst({ where: { status: "OPEN" } })) throw new Error("Close the disposable test shift first. Tests will not modify someone else's shift.");
  shiftId = (await db.cashRegisterShift.create({ data: { businessDate: "2099-12-31", openingBalanceCents: 0, openedByName: "QA", openedByUserId: actor.id } })).id;
});
afterAll(async () => {
  // Delete only fixtures created by this file, never reset the database.
  if (orderIds.length) await db.customerOrder.deleteMany({ where: { id: { in: orderIds } } });
  if (shiftId) await db.cashRegisterShift.delete({ where: { id: shiftId } });
  await db.auditLog.deleteMany({ where: { actorUserId: actor.id } });
  await db.$disconnect();
});
async function paidFixture(dailyNumber: number) {
  const order = await db.customerOrder.create({ data: { clientRequestId: randomUUID(), dailyNumber, businessDate: "2099-12-31", mode: "DELIVERY", status: "PAID", paymentStatus: "PAID", paymentMethod: "CASH", deliveryStatus: "DELIVERED", subtotalCents: 1574, totalCents: 1574, paidAt: new Date() } });
  orderIds.push(order.id);
  const event = await db.paymentEvent.create({ data: { orderId: order.id, shiftId, type: "PAYMENT", method: "CASH", cashCustody: "DRIVER", actorUserId: "qa-driver", actorName: "QA Driver", amountCents: 1574 } });
  return { order, event };
}
describe("PostgreSQL cash concurrency — disposable database only", () => {
  it("blocks closure, accepts two concurrent receipts idempotently and preserves revenue", async () => {
    const { order, event } = await paidFixture(900001);
    const blocked = await closeShift(request({ actualCashCents: 1574 }), { params: Promise.resolve({ id: shiftId! }) });
    expect(blocked.status).toBe(409);
    const results = await Promise.all([confirmCashHandover(event.id, actor), confirmCashHandover(event.id, actor)]);
    expect(results[0].id).toBe(results[1].id);
    expect(await db.driverCashHandover.count({ where: { paymentEventId: event.id } })).toBe(1);
    expect(await db.paymentEvent.count({ where: { orderId: order.id } })).toBe(1);
    expect((await db.cashRegisterShift.findUniqueOrThrow({ where: { id: shiftId } })).status).toBe("OPEN");
  });
  it("allows only one concurrent refund for the same order version", async () => {
    const { order } = await paidFixture(900002);
    const context = { params: Promise.resolve({ id: String(order.id) }) };
    const body = { action: "REFUND", version: order.version, amountCents: 1000, reason: "QA duplicate request" };
    const responses = await Promise.all([refund(request(body), context), refund(request(body), context)]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(await db.paymentEvent.count({ where: { orderId: order.id, type: "REFUND" } })).toBe(1);
    expect((await db.customerOrder.findUniqueOrThrow({ where: { id: order.id } })).version).toBe(order.version + 1);
  });
});
