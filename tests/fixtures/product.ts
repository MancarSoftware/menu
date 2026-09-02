import type { MenuItemView } from "@/lib/domain";
import type { ProductOptions } from "@/lib/product-customization";

export const productOptions: ProductOptions = {
  portions: [{ id: "base", label: "Sencilla", priceCents: 0 }, { id: "double", label: "Doble", priceCents: 225 }],
  extras: [{ id: "cheese", label: "Queso", priceCents: 75 }, { id: "bacon", label: "Tocino", priceCents: 125 }],
  sauces: ["BBQ + miel", "Ajo | limón"],
  removableIngredients: ["Carne", "Lechuga"], maxExtras: 1, maxSauces: 1,
};
export const configurableProduct: MenuItemView = {
  id: "burger", name: "Hamburguesa de prueba", slug: "hamburguesa-prueba", shortDescription: "Hamburguesa al grill", description: "Hamburguesa preparada al momento para pruebas.",
  priceCents: 699, imageUrl: "/images/fast-food/burger-classic.webp", isAvailable: true, isFeatured: false, isChefRecommendation: false, displayOrder: 0,
  ingredients: ["Carne", "Lechuga", "Tomate"], dietaryTags: [], allergens: [], spicyLevel: null, categoryId: "burgers", categoryName: "Hamburguesas", categorySlug: "hamburguesas", customizationOptions: productOptions,
};
