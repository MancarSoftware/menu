import { describe, expect, it } from "vitest";
import { createCustomizationKey, getProductOptions, resolveProductCustomization } from "@/features/menu/product-options";
import { emptyProductOptions, parseProductOptions, productOptionsSchema } from "@/lib/product-customization";
import { menuItemSchema, dineInOrderSchema } from "@/lib/validation";
import { configurableProduct as product, productOptions } from "./fixtures/product";

describe("product customization rules", () => {
  it.each(["hamburguesas", "pizzas", "bebidas", "combos"])("preserves the legacy %s preset and cart keys", (categorySlug) => {
    const legacy = { ...product, categorySlug, customizationOptions: null };
    const options = getProductOptions(legacy);
    expect(options.portions[0].priceCents).toBe(0);
    expect(resolveProductCustomization(legacy, `${options.portions[0].id}|||`)?.extraPriceCents).toBe(0);
    expect(options.removableIngredients).not.toContain("Carne");
  });
  it("uses explicit product options even for formerly excluded ingredients", () => {
    expect(getProductOptions(product)).toEqual(productOptions);
    expect(getProductOptions({ ...product, categorySlug: "bebidas" })).toEqual(productOptions);
    expect(getProductOptions({ ...product, customizationOptions: emptyProductOptions() }).extras).toEqual([]);
  });
  it("calculates surcharges from saved prices, preserving delimiter characters in labels", () => {
    const selection = createCustomizationKey("double", ["cheese"], ["BBQ + miel"], ["Carne"]);
    expect(resolveProductCustomization(product, selection)).toEqual({ labels: ["Tamaño: Doble", "Extras: Queso", "Salsas: BBQ + miel", "Sin: Carne"], extraPriceCents: 300 });
  });
  it("supports products without sizes and standard quick-add carts", () => {
    const item = { ...product, customizationOptions: emptyProductOptions() };
    expect(resolveProductCustomization(item, createCustomizationKey("", [], [], []))).toEqual({ labels: [], extraPriceCents: 0 });
    expect(resolveProductCustomization(item, "standard")).toEqual({ labels: [], extraPriceCents: 0 });
    expect(resolveProductCustomization(item, "base|||")).toBeNull();
  });
  it.each([
    ["base", ["cheese", "bacon"], [], []],
    ["base", [], ["BBQ + miel", "Ajo | limón"], []],
    ["base", ["cheese", "cheese"], [], []],
    ["base", [], ["BBQ + miel", "BBQ + miel"], []],
    ["base", [], [], ["Carne", "Carne"]],
    ["unknown", [], [], []],
    ["base", ["unknown"], [], []],
    ["base", [], ["unknown"], []],
    ["base", [], [], ["Tomate"]],
  ] as [string, string[], string[], string[]][])("rejects forged or disallowed selections (%s, %j, %j, %j)", (...selection) => {
    expect(resolveProductCustomization(product, createCustomizationKey(...selection))).toBeNull();
  });
  it.each(["v2:broken", "v2:{}", 'v2:["base",null,[],[]]', 'v2:["base",[1],[],[]]', "base|cheese", "||||"])("rejects malformed keys: %s", (key) => {
    expect(resolveProductCustomization(product, key)).toBeNull();
  });
  it("enforces zero limits and rejects options removed since the item was added to cart", () => {
    const item = { ...product, customizationOptions: { ...productOptions, maxExtras: 0, maxSauces: 0 } };
    expect(resolveProductCustomization(item, createCustomizationKey("base", ["cheese"], [], []))).toBeNull();
    expect(resolveProductCustomization(item, createCustomizationKey("base", [], ["BBQ + miel"], []))).toBeNull();
    expect(resolveProductCustomization({ ...item, customizationOptions: emptyProductOptions() }, "double|cheese||")).toBeNull();
  });
  it("round-trips persisted options but never silently falls back for corrupt data", () => {
    expect(parseProductOptions(JSON.stringify(productOptions))).toEqual(productOptions);
    expect(parseProductOptions(null)).toBeNull();
    expect(() => parseProductOptions("{}")).toThrow();
    expect(() => parseProductOptions("broken")).toThrow();
  });
  it.each([
    { maxExtras: -1 }, { maxSauces: 21 }, { maxExtras: 1.5 },
    { portions: [{ id: "base", label: "Base", priceCents: 1 }] },
    { extras: [{ id: "cheese", label: "Queso", priceCents: -1 }] },
    { extras: [{ id: "cheese", label: "Queso", priceCents: 0.5 }] },
    { extras: [{ id: "cheese", label: "", priceCents: 0 }] },
    { extras: [productOptions.extras[0], { ...productOptions.extras[0], id: "another" }] },
    { extras: [productOptions.extras[0], { ...productOptions.extras[0], label: "Otro" }] },
    { sauces: ["BBQ", " bbq "] },
    { sauces: Array.from({ length: 21 }, (_, index) => `Salsa ${index}`) },
  ])("validates configuration at the API boundary: %j", (override) => {
    expect(productOptionsSchema.safeParse({ ...productOptions, ...override }).success).toBe(false);
  });
  it("requires removals to belong to the product ingredient list", () => {
    expect(menuItemSchema.safeParse(product).success).toBe(true);
    expect(menuItemSchema.safeParse({ ...product, ingredients: [] }).success).toBe(false);
  });
  it("accepts a complete selection at maximum supported option lengths", () => {
    const names = Array.from({ length: 20 }, (_, index) => `${index}${'"'.repeat(77)}`);
    const customizationKey = createCustomizationKey("base", Array.from({ length: 20 }, (_, index) => `extra-${index}`), names, names);
    expect(dineInOrderSchema.safeParse({ clientRequestId: crypto.randomUUID(), items: [{ productId: "burger", quantity: 1, customizationKey }] }).success).toBe(true);
  });
});
