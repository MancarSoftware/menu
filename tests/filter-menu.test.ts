import { describe, expect, it } from "vitest";
import type { MenuCategoryView, MenuItemView } from "@/lib/domain";
import { filterMenu, matchesMenuItem } from "@/features/menu/filter-menu";

const item = (partial: Partial<MenuItemView> = {}): MenuItemView => ({
  id: "1", name: "Coliflor de carbón", slug: "coliflor", shortDescription: "Maní y uvilla", description: "Coliflor asada", priceCents: 1650, imageUrl: "/image.png", isAvailable: true, isFeatured: false, isChefRecommendation: false, displayOrder: 0, dietaryTags: ["Vegano", "Sin gluten"], ingredients: ["Coliflor", "Maní"], allergens: ["Maní"], spicyLevel: null, categoryId: "cat", categoryName: "Huerta", categorySlug: "huerta", ...partial,
});

const categories: MenuCategoryView[] = [{ id: "cat", name: "Huerta", slug: "huerta", description: "Vegetales", displayOrder: 0, isActive: true, items: [item()] }];

describe("menu filtering", () => {
  it("searches names, descriptions, ingredients and tags without case sensitivity", () => {
    expect(matchesMenuItem(item(), "MANÍ", "all")).toBe(true);
    expect(matchesMenuItem(item(), "vegano", "all")).toBe(true);
    expect(matchesMenuItem(item(), "pulpo", "all")).toBe(false);
  });
  it("applies dietary and chef filters", () => {
    expect(filterMenu(categories, "", "vegan")).toHaveLength(1);
    expect(filterMenu(categories, "", "vegetarian")).toHaveLength(0);
    expect(matchesMenuItem(item({ isChefRecommendation: true }), "", "chef")).toBe(true);
  });
  it("removes empty categories after filtering", () => {
    expect(filterMenu(categories, "chocolate", "all")).toEqual([]);
  });
});
