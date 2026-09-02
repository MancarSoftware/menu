import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/items/route";
import { PATCH } from "@/app/api/items/[id]/route";
import { createCustomerOrder } from "@/lib/order-service";
import { createCustomizationKey } from "@/features/menu/product-options";
import { configurableProduct as product, productOptions } from "./fixtures/product";

const mocks = vi.hoisted(() => ({ admin: true, db: {
  menuItem: { create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  customerOrder: { findUnique: vi.fn(), create: vi.fn() },
  dailyOrderCounter: { upsert: vi.fn() }, $transaction: vi.fn(),
} }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/auth", () => ({ requireAdminApi: async () => mocks.admin }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const stored = { ...product, ingredients: JSON.stringify(product.ingredients), dietaryTags: "[]", allergens: "[]", customizationOptions: JSON.stringify(productOptions), category: { name: "Hamburguesas", slug: "hamburguesas" } };
const request = (body: unknown, origin = "http://localhost:3000") => new NextRequest("http://localhost:3000/api/items", { method: "POST", headers: { origin, host: "localhost:3000", "content-type": "application/json" }, body: JSON.stringify(body) });
const context = { params: Promise.resolve({ id: "burger" }) };

beforeEach(() => {
  vi.clearAllMocks(); mocks.admin = true;
  mocks.db.menuItem.create.mockResolvedValue(stored);
  mocks.db.menuItem.update.mockResolvedValue(stored);
  mocks.db.menuItem.findMany.mockResolvedValue([stored]);
  mocks.db.customerOrder.findUnique.mockResolvedValue(null);
  mocks.db.customerOrder.create.mockImplementation(async (args) => args.data);
  mocks.db.dailyOrderCounter.upsert.mockResolvedValue({ lastNumber: 1 });
  mocks.db.$transaction.mockImplementation(async (callback) => callback(mocks.db));
});

describe("product options API and checkout (database mocked)", () => {
  it("saves and serializes options when creating or editing a product", async () => {
    const created = await POST(request(product));
    expect(created.status).toBe(201);
    expect((await created.json()).item.customizationOptions).toEqual(productOptions);
    expect(mocks.db.menuItem.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ customizationOptions: JSON.stringify(productOptions) }) }));
    expect((await PATCH(request(product), context)).status).toBe(200);
    expect(mocks.db.menuItem.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ customizationOptions: JSON.stringify(productOptions) }) }));
  });
  it("preserves options on legacy requests that omit the field", async () => {
    const legacy = { ...product, customizationOptions: undefined };
    expect((await PATCH(request(legacy), context)).status).toBe(200);
    expect(mocks.db.menuItem.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ customizationOptions: undefined }) }));
  });
  it("rejects invalid modifiers before a database write", async () => {
    expect((await POST(request({ ...product, customizationOptions: { ...productOptions, maxSauces: -1 } }))).status).toBe(400);
    expect((await PATCH(request({ ...product, ingredients: [] }), context)).status).toBe(400);
    expect(mocks.db.menuItem.create).not.toHaveBeenCalled(); expect(mocks.db.menuItem.update).not.toHaveBeenCalled();
  });
  it("requires administrator authentication and same-origin requests", async () => {
    mocks.admin = false;
    expect((await POST(request(product))).status).toBe(401);
    expect((await PATCH(request(product), context)).status).toBe(401);
    mocks.admin = true;
    expect((await POST(request(product, "https://other.invalid"))).status).toBe(403);
    expect((await PATCH(request(product, "https://other.invalid"), context)).status).toBe(403);
    expect(mocks.db.menuItem.create).not.toHaveBeenCalled(); expect(mocks.db.menuItem.update).not.toHaveBeenCalled();
  });
  it.each(["DINE_IN", "DELIVERY", "PICKUP"] as const)("uses saved options and quantity in %s checkout", async (mode) => {
    const result = await createCustomerOrder({ clientRequestId: crypto.randomUUID(), mode, notes: "", items: [{ productId: product.id, quantity: 2, customizationKey: createCustomizationKey("double", ["cheese"], ["BBQ + miel"], ["Carne"]) }] });
    expect(result.order).toEqual(expect.objectContaining({ subtotalCents: 1998, totalCents: mode === "DELIVERY" ? 2248 : 1998 }));
    expect(mocks.db.customerOrder.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ items: { create: [expect.objectContaining({ unitPriceCents: 999, lineTotalCents: 1998, extraPriceCents: 300, customization: JSON.stringify(["Tamaño: Doble", "Extras: Queso", "Salsas: BBQ + miel", "Sin: Carne"]) })] } }) }));
  });
  it("refuses a stale cart with a removed extra, without creating an order", async () => {
    mocks.db.menuItem.findMany.mockResolvedValue([{ ...stored, customizationOptions: JSON.stringify({ ...productOptions, extras: [] }) }]);
    await expect(createCustomerOrder({ clientRequestId: crypto.randomUUID(), mode: "PICKUP", notes: "", items: [{ productId: product.id, quantity: 1, customizationKey: createCustomizationKey("base", ["cheese"], [], []) }] })).rejects.toThrow("Retíralo del carrito");
    expect(mocks.db.customerOrder.create).not.toHaveBeenCalled();
  });
});
