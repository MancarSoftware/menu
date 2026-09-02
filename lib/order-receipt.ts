import { db } from "./db";
import type { StaffRole } from "./domain";
import { orderInclude, toOrderView } from "./order-serializers";
import { staffDisplayName } from "./payment-labels";

export async function getOrderReceipt(id: number, actor: { id: string; role: StaffRole }) {
  if (!Number.isSafeInteger(id) || id < 1) return null;
  const order = await db.customerOrder.findFirst({
    where: { id, ...(actor.role === "DRIVER" ? { mode: "DELIVERY", assignedDriverId: actor.id } : {}) },
    include: { ...orderInclude, assignedDriver: { select: { name: true } }, paymentEvents: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) return null;
  const [restaurant, staff] = await Promise.all([
    db.restaurant.findUniqueOrThrow({ where: { id: 1 }, select: { name: true, address: true, city: true, phone: true } }),
    db.adminUser.findMany({ where: { OR: [
      { id: { in: order.paymentEvents.flatMap((event) => event.actorUserId ? [event.actorUserId] : []) } },
      { email: { in: order.paymentEvents.filter((event) => event.actorName.includes("@")).map((event) => event.actorName) } },
    ] }, select: { id: true, name: true, email: true } }),
  ]);
  return {
    restaurant, order: toOrderView(order),
    driverName: order.assignedDriver ? staffDisplayName(order.assignedDriver.name) : null,
    paymentEvents: order.paymentEvents.map((event) => {
      const person = event.actorName.includes("@") ? staff.find((user) => user.id === event.actorUserId || user.email === event.actorName) : null;
      return { id: event.id, type: event.type, method: event.method, amountCents: event.amountCents, reason: event.reason, actorName: staffDisplayName(person?.name ?? event.actorName), createdAt: event.createdAt.toISOString() };
    }),
  };
}
