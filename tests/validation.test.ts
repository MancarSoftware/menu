import { describe, expect, it } from "vitest";
import { categorySchema, menuItemSchema, passwordSchema, publicOrderSchema, restaurantSchema } from "@/lib/validation";

describe("runtime validation", () => {
  it("rejects invalid category slugs", () => {
    expect(categorySchema.safeParse({ name: "Mar", slug: "Mar y Río", description: "Pesca del día", displayOrder: 0, isActive: true }).success).toBe(false);
  });
  it("rejects negative prices and excessive spicy levels", () => {
    const result = menuItemSchema.safeParse({ name: "Plato", slug: "plato", shortDescription: "Descripción breve", description: "Una descripción suficientemente completa", priceCents: -1, imageUrl: "/x.png", categoryId: "cat", isAvailable: true, isFeatured: false, isChefRecommendation: false, displayOrder: 0, dietaryTags: [], ingredients: [], allergens: [], spicyLevel: 4 });
    expect(result.success).toBe(false);
  });
  it("accepts a complete restaurant contract", () => {
    const result = restaurantSchema.safeParse({ name: "El Bueno", tagline: "Rápido, fresco y sabroso", description: "Hamburguesas, pizzas y combos preparados al momento.", address: "Centro Histórico", city: "Quito", countryCode: "EC", latitude: -0.220164, longitude: -78.512327, phone: "+593 2 255 5555", whatsapp: "593995555555", email: "hola@example.com", openingHours: [{ days: "Lunes a domingo", hours: "11:00 — 23:00" }], socialLinks: { instagram: "https://instagram.com" } });
    expect(result.success).toBe(true);
  });
  it("requires customer contact details for delivery and pickup orders", () => {
    const result = publicOrderSchema.safeParse({ clientRequestId: crypto.randomUUID(), mode: "DELIVERY", customerName: "Ana", customerPhone: "0999999999", deliveryAddress: "", notes: "", items: [{ productId: "burger", quantity: 1, customizationKey: "standard" }] });
    expect(result.success).toBe(false);
  });
  it.each(["DELIVERY", "PICKUP"])("accepts a valid %s order without a table identifier", (mode) => {
    const result = publicOrderSchema.safeParse({
      clientRequestId: crypto.randomUUID(), mode, customerName: "Ana", customerPhone: "0999999999",
      deliveryAddress: mode === "DELIVERY" ? "Calle de prueba 123" : "", notes: "",
      ...(mode === "DELIVERY" ? { deliveryPoint: { latitude: -0.22, longitude: -78.51 } } : {}),
      items: [{ productId: "burger", quantity: 1, customizationKey: "standard" }],
    });
    expect(result.success).toBe(true);
  });
  it("requires a strong staff password", () => {
    expect(passwordSchema.safeParse("weak-password").success).toBe(false);
    expect(passwordSchema.safeParse("SecureAccess2026").success).toBe(true);
  });
});
