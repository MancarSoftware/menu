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
    const result = restaurantSchema.safeParse({ name: "Brasa", tagline: "Fuego y origen", description: "Una descripción extensa de la propuesta gastronómica.", address: "Calle 1 y 2", phone: "+593 2000000", whatsapp: "593999999999", email: "mesa@example.com", openingHours: [{ days: "Martes", hours: "18:00 — 22:00" }], socialLinks: { instagram: "https://instagram.com" } });
    expect(result.success).toBe(true);
  });
});
