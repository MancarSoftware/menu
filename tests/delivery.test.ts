import { describe, expect, it } from "vitest";
import { canDriverCollectPayment, deliveryActionError, deliveryDirectionsUrl } from "@/lib/delivery";
import { publicOrderSchema, staffRoleSchema } from "@/lib/validation";

const driver = { id: "driver1", role: "DRIVER" as const, canCollectCash: false };
const manager = { id: "admin1", role: "ADMIN" as const, canCollectCash: false };
const order = { mode: "DELIVERY", status: "READY", deliveryStatus: "PENDING", assignedDriverId: driver.id };
const input = { clientRequestId: crypto.randomUUID(), mode: "DELIVERY", customerName: "Test customer", customerPhone: "0990000000", items: [{ productId: "burger", quantity: 1 }] };

describe("delivery location", () => {
  it("rejects a typed address without a confirmed point", () => {
    expect(publicOrderSchema.safeParse({ ...input, deliveryAddress: "A typed delivery address" }).success).toBe(false);
  });
  it("accepts confirmed coordinates without requiring a typed address", () => {
    expect(publicOrderSchema.safeParse({ ...input, deliveryPoint: { latitude: -0.22, longitude: -78.51 } }).success).toBe(true);
  });
  it.each([{ latitude: 91, longitude: 0 }, { latitude: 0, longitude: -181 }, { latitude: "0", longitude: 0 }, { latitude: 0 }, { latitude: NaN, longitude: 0 }, { latitude: Infinity, longitude: 0 }])("rejects malformed coordinates %j", (deliveryPoint) => {
    expect(publicOrderSchema.safeParse({ ...input, deliveryPoint }).success).toBe(false);
  });
  it("does not require or persist a delivery location for pickup", () => {
    expect(publicOrderSchema.safeParse({ ...input, mode: "PICKUP" }).success).toBe(true);
    const parsed = publicOrderSchema.parse({ ...input, mode: "PICKUP", deliveryPoint: { latitude: 0, longitude: 0 }, deliveryAddress: "Ignore this" });
    expect(parsed.deliveryPoint).toBeUndefined(); expect(parsed.deliveryAddress).toBe("");
  });
  it("creates an encoded directions URL, including valid zero coordinates", () => {
    const url = new URL(deliveryDirectionsUrl({ deliveryLatitude: 0, deliveryLongitude: 0, deliveryAddress: "ignored" })!);
    expect(url.origin).toBe("https://www.google.com");
    expect(url.searchParams.get("destination")).toBe("0,0");
    expect(url.searchParams.has("origin")).toBe(false);
  });
  it("supports legacy address-only orders without treating addresses as URLs", () => {
    const url = new URL(deliveryDirectionsUrl({ deliveryLatitude: null, deliveryLongitude: null, deliveryAddress: "Street & number #4" })!);
    expect(url.searchParams.get("destination")).toBe("Street & number #4");
    expect(deliveryDirectionsUrl({ deliveryLatitude: null, deliveryLongitude: null, deliveryAddress: null })).toBeNull();
  });
});

describe("delivery workflow permissions", () => {
  it("accepts the dedicated driver staff role", () => expect(staffRoleSchema.parse("DRIVER")).toBe("DRIVER"));
  it("restricts assignments to admin and cashier", () => {
    expect(deliveryActionError(order, driver, "ASSIGN")).toBeTruthy();
    expect(deliveryActionError(order, manager, "ASSIGN")).toBeNull();
    expect(deliveryActionError(order, { ...manager, role: "CASHIER" }, "ASSIGN")).toBeNull();
  });
  it("blocks other drivers, kitchen staff and unassigned orders", () => {
    expect(deliveryActionError(order, { ...driver, id: "other" }, "DISPATCH")).toBeTruthy();
    expect(deliveryActionError(order, { ...driver, role: "KITCHEN" }, "DISPATCH")).toBeTruthy();
    expect(deliveryActionError({ ...order, assignedDriverId: null }, manager, "DISPATCH")).toBeTruthy();
  });
  it("only dispatches ready deliveries once", () => {
    expect(deliveryActionError(order, driver, "DISPATCH")).toBeNull();
    expect(deliveryActionError({ ...order, status: "PREPARING" }, driver, "DISPATCH")).toBeTruthy();
    expect(deliveryActionError({ ...order, deliveryStatus: "OUT_FOR_DELIVERY" }, driver, "DISPATCH")).toBeTruthy();
    expect(deliveryActionError({ ...order, mode: "PICKUP" }, driver, "DISPATCH")).toBeTruthy();
  });
  it("requires departure before delivery", () => {
    expect(deliveryActionError(order, driver, "DELIVER")).toBeTruthy();
    expect(deliveryActionError({ ...order, deliveryStatus: "OUT_FOR_DELIVERY" }, driver, "DELIVER")).toBeNull();
    expect(deliveryActionError({ ...order, status: "CANCELLED" }, manager, "DELIVER")).toBeTruthy();
  });
  it("requires explicit permission, ownership, completed delivery and cash method to collect", () => {
    const delivered = { ...order, status: "SERVED", deliveryStatus: "DELIVERED" };
    const authorized = { ...driver, canCollectCash: true };
    expect(canDriverCollectPayment(delivered, driver, "CASH")).toBe(false);
    expect(canDriverCollectPayment(delivered, authorized, "CARD")).toBe(false);
    expect(canDriverCollectPayment(delivered, { ...authorized, id: "other" }, "CASH")).toBe(false);
    expect(canDriverCollectPayment(order, authorized, "CASH")).toBe(false);
    expect(canDriverCollectPayment(delivered, authorized, "CASH")).toBe(true);
  });
});
