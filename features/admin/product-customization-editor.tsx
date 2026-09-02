"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ProductOptions } from "@/lib/product-customization";

type PricedOptionDraft = { id: string; label: string; price: string };
export type ProductOptionsDraft = Omit<ProductOptions, "portions" | "extras"> & {
  portions: PricedOptionDraft[];
  extras: PricedOptionDraft[];
};

export function toOptionsDraft(options: ProductOptions): ProductOptionsDraft {
  const priced = (entries: ProductOptions["portions"]) => entries.map(({ priceCents, ...option }) => ({ ...option, price: (priceCents / 100).toFixed(2) }));
  return { ...options, portions: priced(options.portions), extras: priced(options.extras) };
}

export function fromOptionsDraft(draft: ProductOptionsDraft): ProductOptions {
  const priced = (entries: PricedOptionDraft[]) => entries.map(({ price, ...option }) => ({ ...option, priceCents: price.trim() ? Math.round(Number(price) * 100) : NaN }));
  return {
    ...draft, portions: priced(draft.portions), extras: priced(draft.extras),
    maxExtras: !draft.extras.length && Number.isNaN(draft.maxExtras) ? 20 : draft.maxExtras,
    maxSauces: !draft.sauces.length && Number.isNaN(draft.maxSauces) ? 2 : draft.maxSauces,
  };
}

function PricedOptionsEditor({ group, title, description, entries, onChange }: {
  group: "portions" | "extras"; title: string; description: string;
  entries: PricedOptionDraft[]; onChange: (value: PricedOptionDraft[]) => void;
}) {
  return <fieldset className="customization-editor__group">
    <legend>{title} <small>{entries.length}/20</small></legend>
    <p>{description}</p>
    {entries.map((option, index) => <div key={option.id} className="customization-editor__row">
      <div className="form-field"><label htmlFor={`option-${group}-${option.id}`}>{title}: nombre {index + 1}</label><input id={`option-${group}-${option.id}`} required maxLength={80} value={option.label} onChange={(event) => onChange(entries.map((entry) => entry.id === option.id ? { ...entry, label: event.target.value } : entry))} /></div>
      <div className="form-field"><label htmlFor={`price-${group}-${option.id}`}>Recargo USD {index + 1}</label><input id={`price-${group}-${option.id}`} type="number" inputMode="decimal" required min="0" max="10000" step="0.01" value={option.price} onChange={(event) => onChange(entries.map((entry) => entry.id === option.id ? { ...entry, price: event.target.value } : entry))} /></div>
      <button type="button" className="icon-button icon-button--danger" aria-label={`Eliminar ${title.toLowerCase()} ${index + 1}`} onClick={() => onChange(entries.filter((entry) => entry.id !== option.id))}><Trash2 aria-hidden="true" /></button>
    </div>)}
    {!entries.length && <p className="customization-editor__empty">{group === "portions" ? "Sin tamaños: se vende al precio base." : "Sin extras adicionales."}</p>}
    <button type="button" className="button button--line customization-editor__add" disabled={entries.length >= 20} onClick={() => onChange([...entries, { id: crypto.randomUUID(), label: "", price: "0.00" }])}><Plus aria-hidden="true" />{group === "portions" ? "Añadir tamaño" : "Añadir extra"}</button>
  </fieldset>;
}

export function ProductCustomizationEditor({ value, ingredients, onChange, error, disabled }: {
  value: ProductOptionsDraft; ingredients: string[]; onChange: (value: ProductOptionsDraft) => void; error: string | null; disabled: boolean;
}) {
  return <fieldset className="customization-editor" disabled={disabled}>
    <legend>Personalización del producto</legend>
    <p>Configura lo que el cliente puede añadir o quitar. Los recargos se suman al precio base por cada unidad.</p>
    {error && <p className="customization-editor__error" role="alert">{error}</p>}
    <PricedOptionsEditor group="portions" title="Tamaños" description="El primer tamaño es el predeterminado y debe tener recargo $0. Deja este grupo vacío si no hay tamaños." entries={value.portions} onChange={(portions) => onChange({ ...value, portions })} />
    <PricedOptionsEditor group="extras" title="Extras" description="Ingredientes adicionales con precio propio. Cada extra se puede elegir una vez por unidad." entries={value.extras} onChange={(extras) => onChange({ ...value, extras })} />
    {value.extras.length > 0 && <div className="form-field customization-editor__limit"><label htmlFor="option-max-extras">Máximo de extras por unidad</label><input id="option-max-extras" type="number" min="0" max="20" required value={Number.isNaN(value.maxExtras) ? "" : value.maxExtras} onChange={(event) => onChange({ ...value, maxExtras: event.target.value === "" ? NaN : Number(event.target.value) })} /><small>0 oculta los extras. 20 permite seleccionar todos los configurados.</small></div>}
    <fieldset className="customization-editor__group">
      <legend>Salsas <small>{value.sauces.length}/20</small></legend>
      <p>Opcionales e incluidas sin recargo. Para una salsa con costo, añádela como extra.</p>
      {value.sauces.map((sauce, index) => <div key={index} className="customization-editor__row customization-editor__row--simple"><div className="form-field"><label htmlFor={`option-sauce-${index}`}>Salsa {index + 1}</label><input id={`option-sauce-${index}`} required maxLength={80} value={sauce} onChange={(event) => onChange({ ...value, sauces: value.sauces.map((entry, entryIndex) => entryIndex === index ? event.target.value : entry) })} /></div><button type="button" className="icon-button icon-button--danger" aria-label={`Eliminar salsa ${index + 1}`} onClick={() => onChange({ ...value, sauces: value.sauces.filter((_, entryIndex) => entryIndex !== index) })}><Trash2 aria-hidden="true" /></button></div>)}
      {!value.sauces.length && <p className="customization-editor__empty">Sin salsas opcionales.</p>}
      <button type="button" className="button button--line customization-editor__add" disabled={value.sauces.length >= 20} onClick={() => onChange({ ...value, sauces: [...value.sauces, ""] })}><Plus aria-hidden="true" />Añadir salsa</button>
      {value.sauces.length > 0 && <div className="form-field customization-editor__limit"><label htmlFor="option-max-sauces">Máximo de salsas por unidad</label><input id="option-max-sauces" type="number" min="0" max="20" required value={Number.isNaN(value.maxSauces) ? "" : value.maxSauces} onChange={(event) => onChange({ ...value, maxSauces: event.target.value === "" ? NaN : Number(event.target.value) })} /><small>0 oculta las salsas.</small></div>}
    </fieldset>
    <fieldset className="customization-editor__group">
      <legend>Ingredientes que se pueden quitar</legend>
      <p>Marca solo los que el cliente puede pedir sin incluir. Quitarlos no cambia el precio.</p>
      <div className="customization-editor__ingredients">{[...new Set(ingredients)].map((ingredient) => <label className="check-field" key={ingredient}><input type="checkbox" checked={value.removableIngredients.includes(ingredient)} onChange={(event) => onChange({ ...value, removableIngredients: event.target.checked ? [...value.removableIngredients, ingredient] : value.removableIngredients.filter((entry) => entry !== ingredient) })} /><span>{ingredient}</span></label>)}</div>
      {!ingredients.length && <p className="customization-editor__empty">Primero escribe los ingredientes del producto en el campo de arriba.</p>}
    </fieldset>
    <p className="customization-editor__note">Se publica junto con “Guardar producto” o “Publicar producto”. Solo afecta a este producto; los pedidos ya enviados conservan sus opciones y precios.</p>
  </fieldset>;
}
