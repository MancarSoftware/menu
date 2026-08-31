import type { MenuItemView } from "@/lib/domain";

export type PricedOption = {
  id: string;
  label: string;
  priceCents: number;
};

export type ProductOptions = {
  portions: PricedOption[];
  extras: PricedOption[];
  sauces: string[];
  removableIngredients: string[];
};

const commonSauces = ["Salsa de la casa", "BBQ", "Mayonesa de ajo", "Ají criollo"];

export function getProductOptions(item: MenuItemView): ProductOptions {
  const removableIngredients = item.ingredients.filter((ingredient) =>
    !/carne|pollo|masa|agua|hielo|refresco|pizza|hamburguesa|papas/i.test(ingredient),
  );

  if (item.categorySlug === "pizzas") {
    return {
      portions: [
        { id: "personal", label: "Personal", priceCents: 0 },
        { id: "mediana", label: "Mediana", priceCents: 400 },
        { id: "familiar", label: "Familiar", priceCents: 700 },
      ],
      extras: [
        { id: "queso-extra", label: "Queso extra", priceCents: 150 },
        { id: "pepperoni-extra", label: "Pepperoni extra", priceCents: 200 },
        { id: "borde-queso", label: "Borde de queso", priceCents: 250 },
      ],
      sauces: ["Salsa de ajo", "Ají criollo", "Salsa de tomate"],
      removableIngredients,
    };
  }

  if (item.categorySlug === "bebidas") {
    return {
      portions: [
        { id: "mediana", label: "Mediana", priceCents: 0 },
        { id: "grande", label: "Grande", priceCents: 75 },
      ],
      extras: [],
      sauces: [],
      removableIngredients,
    };
  }

  if (item.categorySlug === "combos") {
    return {
      portions: [
        { id: "regular", label: "Regular", priceCents: 0 },
        { id: "grande", label: "Combo grande", priceCents: 200 },
      ],
      extras: [
        { id: "queso-extra", label: "Queso extra", priceCents: 75 },
        { id: "tocino", label: "Tocino", priceCents: 125 },
        { id: "aguacate", label: "Aguacate", priceCents: 125 },
      ],
      sauces: commonSauces,
      removableIngredients,
    };
  }

  return {
    portions: [
      { id: "sencilla", label: "Sencilla", priceCents: 0 },
      { id: "doble", label: "Doble carne", priceCents: 225 },
    ],
    extras: [
      { id: "queso-extra", label: "Queso extra", priceCents: 75 },
      { id: "tocino", label: "Tocino", priceCents: 125 },
      { id: "aguacate", label: "Aguacate", priceCents: 125 },
    ],
    sauces: commonSauces,
    removableIngredients,
  };
}
