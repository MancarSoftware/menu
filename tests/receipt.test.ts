import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOrderReceipt } from "@/lib/order-receipt";
import { ReceiptDocument } from "@/features/orders/receipt-document";
import { deliveryReceipt, paidDelivery } from "./fixtures/delivery";

const mocks = vi.hoisted(() => ({
  customerOrder: { findFirst: vi.fn() },
  restaurant: { findUniqueOrThrow: vi.fn() },
  adminUser: { findMany: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ db: mocks }));
vi.mock("@/lib/order-serializers", () => ({ orderInclude: {}, toOrderView: () => paidDelivery }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.restaurant.findUniqueOrThrow.mockResolvedValue(deliveryReceipt.restaurant);
  mocks.adminUser.findMany.mockResolvedValue([{ id: "driver1", name: "Ana Repartidora", email: "driver@example.invalid" }]);
  mocks.customerOrder.findFirst.mockResolvedValue({
    ...paidDelivery,
    paymentEvents: [{ ...deliveryReceipt.paymentEvents[0], actorName: "driver@example.invalid", actorUserId: "driver1", createdAt: new Date(deliveryReceipt.paymentEvents[0].createdAt) }],
  });
});
describe("receipt privacy and print content", () => {
  it("resolves legacy payment emails to names without returning staff emails", async () => {
    const receipt = await getOrderReceipt(42, { id: "driver1", role: "DRIVER" });
    expect(mocks.customerOrder.findFirst.mock.calls[0][0].where).toEqual({ id: 42, mode: "DELIVERY", assignedDriverId: "driver1" });
    expect(receipt?.paymentEvents[0].actorName).toBe("Ana Repartidora");
    expect(JSON.stringify(receipt)).not.toContain("@");
  });
  it("does not disclose another driver's receipt or look up additional information", async () => {
    mocks.customerOrder.findFirst.mockResolvedValue(null);
    expect(await getOrderReceipt(42, { id: "other", role: "DRIVER" })).toBeNull();
    expect(mocks.restaurant.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(mocks.adminUser.findMany).not.toHaveBeenCalled();
  });
  it("uses a neutral label when legacy staff no longer exists", async () => {
    mocks.adminUser.findMany.mockResolvedValue([]);
    const receipt = await getOrderReceipt(42, { id: "admin", role: "ADMIN" });
    expect(receipt?.paymentEvents[0].actorName).toBe("Personal del local");
    expect(JSON.stringify(receipt)).not.toContain("@");
  });
  it("rejects invalid receipt IDs before querying", async () => {
    expect(await getOrderReceipt(NaN, { id: "driver1", role: "DRIVER" })).toBeNull();
    expect(mocks.customerOrder.findFirst).not.toHaveBeenCalled();
  });
  it("renders full receipt content, quantity totals, delivery and collector name", () => {
    const html = renderToStaticMarkup(createElement(ReceiptDocument, { receipt: deliveryReceipt }));
    for (const text of ["COMPROBANTE DE PEDIDO", "Hamburguesa Doble", "26,48", "28,98", "2,50", "Repartidor", "Ana Repartidora", "Cobro", "Efectivo", "No es una factura tributaria"]) expect(html).toContain(text);
    expect(html).not.toContain("@");
  });
});
