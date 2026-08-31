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

type ConfigurableProduct = Pick<MenuItemView, "categorySlug" | "ingredients">;

export function getProductOptions(item: ConfigurableProduct): ProductOptions {
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

export function resolveProductCustomization(item: ConfigurableProduct, key: string) {
  if (key === "standard") return { labels: [] as string[], extraPriceCents: 0 };
  const parts = key.split("|");
  if (parts.length !== 4) return null;
  const [portionId, extraValue, sauceValue, removedValue] = parts;
  const extraIds = extraValue.split("+").filter(Boolean);
  const sauces = sauceValue.split("+").filter(Boolean);
  const removedIngredients = removedValue.split("+").filter(Boolean);
  const options = getProductOptions(item);
  const portion = options.portions.find((option) => option.id === portionId);
  const extras = extraIds.map((id) => options.extras.find((option) => option.id === id));

  if (!portion || extras.some((option) => !option)) return null;
  if (new Set(extraIds).size !== extraIds.length || new Set(sauces).size !== sauces.length || new Set(removedIngredients).size !== removedIngredients.length) return null;
  if (sauces.length > 2 || sauces.some((sauce) => !options.sauces.includes(sauce))) return null;
  if (removedIngredients.some((ingredient) => !options.removableIngredients.includes(ingredient))) return null;

  const selectedExtras = extras.filter((option): option is PricedOption => Boolean(option));
  return {
    labels: [
      `Tamaño: ${portion.label}`,
      selectedExtras.length ? `Extras: ${selectedExtras.map((option) => option.label).join(", ")}` : "",
      sauces.length ? `Salsas: ${sauces.join(", ")}` : "",
      removedIngredients.length ? `Sin: ${removedIngredients.join(", ")}` : "",
    ].filter(Boolean),
    extraPriceCents: portion.priceCents + selectedExtras.reduce((total, option) => total + option.priceCents, 0),
  };
}
