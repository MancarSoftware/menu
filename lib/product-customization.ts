import { z } from "zod";

const label = z.string().trim().min(1, "Escribe un nombre para cada opción.").max(80);
const pricedOption = z.object({
  id: z.string().min(1).max(60).regex(/^[a-zA-Z0-9_-]+$/),
  label,
  priceCents: z.number().int().min(0, "El recargo no puede ser negativo.").max(1000000),
});

export const productOptionsSchema = z.object({
  portions: z.array(pricedOption).max(20),
  extras: z.array(pricedOption).max(20),
  sauces: z.array(label).max(20),
  removableIngredients: z.array(label).max(20),
  maxExtras: z.number().int().min(0).max(20),
  maxSauces: z.number().int().min(0).max(20),
}).superRefine((options, context) => {
  // The first size is the base product, also used by older/quick-add carts.
  if (options.portions.length && options.portions[0].priceCents !== 0) {
    context.addIssue({ code: "custom", path: ["portions", 0, "priceCents"], message: "El primer tamaño debe estar incluido en el precio base (recargo $0)." });
  }
  for (const group of ["portions", "extras", "sauces", "removableIngredients"] as const) {
    const values = options[group].map((option) => typeof option === "string" ? option : option.label);
    if (new Set(values.map((value) => value.toLocaleLowerCase("es"))).size !== values.length) {
      context.addIssue({ code: "custom", path: [group], message: "No repitas nombres dentro del mismo grupo." });
    }
  }
  for (const group of ["portions", "extras"] as const) {
    if (new Set(options[group].map((option) => option.id)).size !== options[group].length) {
      context.addIssue({ code: "custom", path: [group], message: "Hay opciones duplicadas. Elimina la opción repetida." });
    }
  }
});

export type ProductOptions = z.infer<typeof productOptionsSchema>;
export type PricedOption = ProductOptions["portions"][number];

export function emptyProductOptions(): ProductOptions {
  return { portions: [], extras: [], sauces: [], removableIngredients: [], maxExtras: 20, maxSauces: 2 };
}

export function parseProductOptions(value: string | null | undefined): ProductOptions | null {
  // Null is reserved for products created before the customization editor.
  if (value == null) return null;
  return productOptionsSchema.parse(JSON.parse(value));
}
