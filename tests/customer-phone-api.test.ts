import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/orders/route";
const createOrder = vi.hoisted(() => vi.fn());
vi.mock("@/lib/order-service", () => ({ createCustomerOrder: createOrder, OrderInputError: class extends Error {} }));
vi.mock("@/lib/order-serializers", () => ({ toOrderView: (order: unknown) => order }));

describe("public order phone API", () => {
  it.each(["099999999", "09999999999", "+593999999999", "099 9999999", "abcdefghij", null])("rejects an invalid phone before creating an order: %s", async (customerPhone) => {
    createOrder.mockClear();
    const response = await POST(new NextRequest("http://localhost/api/orders", { method: "POST", headers: { origin: "http://localhost", host: "localhost", "content-type": "application/json" }, body: JSON.stringify({ clientRequestId: crypto.randomUUID(), mode: "PICKUP", customerName: "Ana", customerPhone, items: [{ productId: "burger", quantity: 1 }] }) }));
    expect(response.status).toBe(400);
    expect((await response.json()).issues[0].path).toEqual(["customerPhone"]);
    expect(createOrder).not.toHaveBeenCalled();
  });
});
