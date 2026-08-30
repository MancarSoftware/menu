import type { MenuCategoryView, MenuItemView } from "@/lib/domain";

export type MenuFilter = "all" | "vegetarian" | "vegan" | "gluten-free" | "chef";

const tagByFilter: Partial<Record<MenuFilter, string>> = {
  vegetarian: "vegetariano",
  vegan: "vegano",
  "gluten-free": "sin gluten",
};

export function matchesMenuItem(item: MenuItemView, query: string, filter: MenuFilter) {
  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const haystack = [item.name, item.shortDescription, item.description, item.categoryName, ...item.ingredients, ...item.dietaryTags].join(" ").toLocaleLowerCase("es");
  const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
  if (!matchesQuery) return false;
  if (filter === "all") return true;
  if (filter === "chef") return item.isChefRecommendation;
  const expectedTag = tagByFilter[filter];
  return item.dietaryTags.some((tag) => tag.toLocaleLowerCase("es") === expectedTag);
}

export function filterMenu(categories: MenuCategoryView[], query: string, filter: MenuFilter) {
  return categories
    .map((category) => ({ ...category, items: category.items.filter((item) => matchesMenuItem(item, query, filter)) }))
    .filter((category) => category.items.length > 0);
}
