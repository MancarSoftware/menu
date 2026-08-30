import { describe, expect, it } from "vitest";
import type { MenuCategoryView, MenuItemView } from "@/lib/domain";
import { filterMenu, matchesMenuItem } from "@/features/menu/filter-menu";

const item = (partial: Partial<MenuItemView> = {}): MenuItemView => ({
  id: "1", name: "Pizza Margarita", slug: "pizza-margarita", shortDescription: "Mozzarella, tomate y albahaca", description: "Pizza recién horneada", priceCents: 58000, imageUrl: "/image.png", isAvailable: true, isFeatured: false, isChefRecommendation: false, displayOrder: 0, dietaryTags: ["Vegetariano"], ingredients: ["Mozzarella", "Tomate", "Albahaca"], allergens: ["Gluten", "Lácteos"], spicyLevel: null, categoryId: "cat", categoryName: "Pizzas", categorySlug: "pizzas", ...partial,
});

const categories: MenuCategoryView[] = [{ id: "cat", name: "Pizzas", slug: "pizzas", description: "Recién horneadas", displayOrder: 0, isActive: true, items: [item()] }];

describe("menu filtering", () => {
  it("searches names, descriptions, ingredients and tags without case sensitivity", () => {
    expect(matchesMenuItem(item(), "MOZZARELLA", "all")).toBe(true);
    expect(matchesMenuItem(item(), "vegetariano", "all")).toBe(true);
    expect(matchesMenuItem(item(), "pollo", "all")).toBe(false);
  });

  it("applies dietary and recommendation filters", () => {
    expect(filterMenu(categories, "", "vegetarian")).toHaveLength(1);
    expect(filterMenu(categories, "", "vegan")).toHaveLength(0);
    expect(matchesMenuItem(item({ isChefRecommendation: true }), "", "chef")).toBe(true);
  });

  it("removes empty categories after filtering", () => {
    expect(filterMenu(categories, "hamburguesa", "all")).toEqual([]);
  });
});
