import type { MenuItemView } from "@/lib/domain";
import type { PricedOption, ProductOptions } from "@/lib/product-customization";

export type { PricedOption, ProductOptions } from "@/lib/product-customization";

const commonSauces = ["Salsa de la casa", "BBQ", "Mayonesa de ajo", "Ají criollo"];

type ConfigurableProduct = Pick<MenuItemView, "categorySlug" | "ingredients" | "customizationOptions">;

export function getProductOptions(item: ConfigurableProduct): ProductOptions {
  if (item.customizationOptions != null) return item.customizationOptions;
  const legacy = getLegacyProductOptions(item);
  return { ...legacy, maxExtras: 20, maxSauces: 2 };
}

function getLegacyProductOptions(item: ConfigurableProduct): Omit<ProductOptions, "maxExtras" | "maxSauces"> {
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

export function createCustomizationKey(portionId: string, extras: string[], sauces: string[], removedIngredients: string[]) {
  // JSON preserves names containing + or |; old cart keys remain readable below.
  return `v2:${JSON.stringify([portionId, [...extras].sort(), [...sauces].sort(), [...removedIngredients].sort()])}`;
}

function readCustomizationKey(key: string): [string, string[], string[], string[]] | null {
  if (key.startsWith("v2:")) {
    try {
      const value: unknown = JSON.parse(key.slice(3));
      if (!Array.isArray(value) || value.length !== 4 || typeof value[0] !== "string") return null;
      const [portion, ...groups] = value;
      if (!groups.every((group) => Array.isArray(group) && group.length <= 20 && group.every((entry) => typeof entry === "string" && entry.length <= 80))) return null;
      return [portion, groups[0], groups[1], groups[2]];
    } catch { return null; }
  }
  const parts = key.split("|");
  if (parts.length !== 4) return null;
  return [parts[0], ...parts.slice(1).map((part) => part.split("+").filter(Boolean))] as [string, string[], string[], string[]];
}

export function resolveProductCustomization(item: ConfigurableProduct, key: string) {
  if (key === "standard") return { labels: [] as string[], extraPriceCents: 0 };
  const selection = readCustomizationKey(key);
  if (!selection) return null;
  const [portionId, extraIds, sauces, removedIngredients] = selection;
  const options = getProductOptions(item);
  const portion = options.portions.find((option) => option.id === portionId);
  const extras = extraIds.map((id) => options.extras.find((option) => option.id === id));

  if ((options.portions.length ? !portion : portionId !== "") || extras.some((option) => !option)) return null;
  if (extraIds.length > options.maxExtras) return null;
  if (new Set(extraIds).size !== extraIds.length || new Set(sauces).size !== sauces.length || new Set(removedIngredients).size !== removedIngredients.length) return null;
  if (sauces.length > options.maxSauces || sauces.some((sauce) => !options.sauces.includes(sauce))) return null;
  if (removedIngredients.some((ingredient) => !options.removableIngredients.includes(ingredient))) return null;

  const selectedExtras = extras.filter((option): option is PricedOption => Boolean(option));
  return {
    labels: [
      portion ? `Tamaño: ${portion.label}` : "",
      selectedExtras.length ? `Extras: ${selectedExtras.map((option) => option.label).join(", ")}` : "",
      sauces.length ? `Salsas: ${sauces.join(", ")}` : "",
      removedIngredients.length ? `Sin: ${removedIngredients.join(", ")}` : "",
    ].filter(Boolean),
    extraPriceCents: (portion?.priceCents ?? 0) + selectedExtras.reduce((total, option) => total + option.priceCents, 0),
  };
}
