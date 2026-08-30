import type { MenuItem, MenuCategory, Restaurant } from "@prisma/client";
import type { MenuCategoryView, MenuItemView, OpeningHour, RestaurantView, SocialLinks } from "./domain";

export function parseArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed !== null ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

export function toRestaurantView(restaurant: Restaurant): RestaurantView {
  return {
    ...restaurant,
    openingHours: parseJson<OpeningHour[]>(restaurant.openingHours, []),
    socialLinks: parseJson<SocialLinks>(restaurant.socialLinks, {}),
  };
}

type ItemWithCategory = MenuItem & { category: Pick<MenuCategory, "name" | "slug"> };

export function toMenuItemView(item: ItemWithCategory): MenuItemView {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    shortDescription: item.shortDescription,
    description: item.description,
    priceCents: item.priceCents,
    imageUrl: item.imageUrl,
    isAvailable: item.isAvailable,
    isFeatured: item.isFeatured,
    isChefRecommendation: item.isChefRecommendation,
    displayOrder: item.displayOrder,
    dietaryTags: parseArray(item.dietaryTags),
    ingredients: parseArray(item.ingredients),
    allergens: parseArray(item.allergens),
    spicyLevel: item.spicyLevel,
    categoryId: item.categoryId,
    categoryName: item.category.name,
    categorySlug: item.category.slug,
  };
}

type CategoryWithItems = MenuCategory & { items: ItemWithCategory[] };

export function toMenuCategoryView(category: CategoryWithItems): MenuCategoryView {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    displayOrder: category.displayOrder,
    isActive: category.isActive,
    items: category.items.map(toMenuItemView),
  };
}
