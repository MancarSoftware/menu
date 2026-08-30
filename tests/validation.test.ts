import { describe, expect, it } from "vitest";
import { categorySchema, menuItemSchema, restaurantSchema } from "@/lib/validation";

describe("runtime validation", () => {
  it("rejects invalid category slugs", () => {
    expect(categorySchema.safeParse({ name: "Mar", slug: "Mar y Río", description: "Pesca del día", displayOrder: 0, isActive: true }).success).toBe(false);
  });
  it("rejects negative prices and excessive spicy levels", () => {
    const result = menuItemSchema.safeParse({ name: "Plato", slug: "plato", shortDescription: "Descripción breve", description: "Una descripción suficientemente completa", priceCents: -1, imageUrl: "/x.png", categoryId: "cat", isAvailable: true, isFeatured: false, isChefRecommendation: false, displayOrder: 0, dietaryTags: [], ingredients: [], allergens: [], spicyLevel: 4 });
    expect(result.success).toBe(false);
  });
  it("accepts a complete restaurant contract", () => {
    const result = restaurantSchema.safeParse({ name: "El Bueno", tagline: "Rápido, fresco y sabroso", description: "Hamburguesas, pizzas y combos preparados al momento.", address: "Calle Duarte 123", phone: "+1 809-555-0100", whatsapp: "18095550100", email: "hola@example.com", openingHours: [{ days: "Lunes a domingo", hours: "11:00 — 23:00" }], socialLinks: { instagram: "https://instagram.com" } });
    expect(result.success).toBe(true);
  });
});
