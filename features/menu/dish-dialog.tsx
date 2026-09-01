"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Flame, Minus, Plus, ShoppingCart, Sparkles, UtensilsCrossed, X } from "lucide-react";
import { useCart } from "@/features/cart/cart-context";
import type { MenuItemView } from "@/lib/domain";
import { formatPrice } from "@/lib/format";
import { getProductOptions } from "./product-options";

export function DishDialog({ item, onClose, whatsapp, dineInTable }: { item: MenuItemView | null; onClose: () => void; whatsapp: string; dineInTable: { number: number; name: string } | null }) {
  const { addItem } = useCart();
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [quantity, setQuantity] = useState(1);
  const [portionId, setPortionId] = useState("");
  const [extras, setExtras] = useState<string[]>([]);
  const [sauces, setSauces] = useState<string[]>([]);
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [added, setAdded] = useState(false);
  const options = useMemo(() => item ? getProductOptions(item) : null, [item]);

  useEffect(() => {
    const dialog = ref.current;
    if (item && options && dialog && !dialog.open) {
      setQuantity(1);
      setPortionId(options.portions[0]?.id ?? "");
      setExtras([]);
      setSauces([]);
      setRemovedIngredients([]);
      setAdded(false);
      dialog.showModal();
      requestAnimationFrame(() => closeRef.current?.focus());
    }
    if (!item && dialog?.open) dialog.close();
  }, [item, options]);

  if (!item || !options) {
    return <dialog ref={ref} className="product-dialog" onClose={onClose} />;
  }

  const selectedPortion = options.portions.find((option) => option.id === portionId) ?? options.portions[0];
  const selectedExtras = options.extras.filter((option) => extras.includes(option.id));
  const extraPriceCents = (selectedPortion?.priceCents ?? 0) + selectedExtras.reduce((total, option) => total + option.priceCents, 0);
  const unitPriceCents = item.priceCents + extraPriceCents;
  const selectionLabels = [
    selectedPortion ? `Tamaño: ${selectedPortion.label}` : "",
    selectedExtras.length ? `Extras: ${selectedExtras.map((option) => option.label).join(", ")}` : "",
    sauces.length ? `Salsas: ${sauces.join(", ")}` : "",
    removedIngredients.length ? `Sin: ${removedIngredients.join(", ")}` : "",
  ].filter(Boolean);
  const selectionKey = [portionId, [...extras].sort().join("+"), [...sauces].sort().join("+"), [...removedIngredients].sort().join("+")].join("|");

  function choosePortion(id: string) {
    setPortionId(id);
    setAdded(false);
  }

  function toggleExtra(id: string) {
    setExtras((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
    setAdded(false);
  }

  function toggleSauce(label: string) {
    setSauces((current) => {
      if (current.includes(label)) return current.filter((value) => value !== label);
      if (current.length >= 2) return current;
      return [...current, label];
    });
    setAdded(false);
  }

  function toggleRemovedIngredient(label: string) {
    setRemovedIngredients((current) => current.includes(label) ? current.filter((value) => value !== label) : [...current, label]);
    setAdded(false);
  }

  function addToCart() {
    if (!item) return;
    addItem(item, quantity, { key: selectionKey, labels: selectionLabels, extraPriceCents });
    setAdded(true);
  }

  const whatsappDetails = selectionLabels.length ? `\n${selectionLabels.join("\n")}` : "";
  const whatsappText = `Hola, quisiera ordenar ${quantity} × ${item.name}.${whatsappDetails}\nTotal: ${formatPrice(unitPriceCents * quantity)}`;
  const totalPrice = formatPrice(unitPriceCents * quantity);

  return (
    <dialog ref={ref} className="product-dialog" onClose={onClose} onClick={(event) => { if (event.target === ref.current) ref.current.close(); }} aria-labelledby="product-dialog-title">
      <div className="product-dialog__panel">
        <button ref={closeRef} className="product-dialog__close" type="button" autoFocus onClick={() => ref.current?.close()} aria-label="Cerrar detalle"><X aria-hidden="true" /></button>
        <div className="product-dialog__image"><Image src={item.imageUrl} alt={item.name} fill sizes="(max-width: 760px) 100vw, 50vw" priority /></div>
        <div className="product-dialog__content">
          <div className="product-dialog__badges">
            {item.isChefRecommendation && <span><Sparkles aria-hidden="true" /> Recomendado</span>}
            {item.spicyLevel ? <span><Flame aria-hidden="true" /> Picante {item.spicyLevel}/3</span> : null}
          </div>
          <h2 id="product-dialog-title">{item.name}</h2>
          <p className="product-dialog__description">{item.description}</p>
          <p className="product-dialog__price"><span>Desde</span>{formatPrice(unitPriceCents)}</p>

          <div className="product-dialog__options">
            <fieldset>
              <legend>Elige tu tamaño</legend>
              <div className="product-option-grid">
                {options.portions.map((option) => <label key={option.id} className="product-option" data-selected={portionId === option.id}><input type="radio" name="portion" value={option.id} checked={portionId === option.id} onChange={() => choosePortion(option.id)} /><span><strong>{option.label}</strong><small>{option.priceCents ? `+${formatPrice(option.priceCents)}` : "Incluido"}</small></span></label>)}
              </div>
            </fieldset>

            {options.extras.length > 0 && <fieldset>
              <legend>Hazla más tuya <small>opcional</small></legend>
              <div className="product-option-list">
                {options.extras.map((option) => <label key={option.id} className="product-check"><input type="checkbox" checked={extras.includes(option.id)} onChange={() => toggleExtra(option.id)} /><span>{option.label}</span><strong>+{formatPrice(option.priceCents)}</strong></label>)}
              </div>
            </fieldset>}

            {options.sauces.length > 0 && <fieldset>
              <legend>Salsas <small>elige hasta 2</small></legend>
              <div className="product-option-chips">
                {options.sauces.map((sauce) => <label key={sauce} data-selected={sauces.includes(sauce)}><input type="checkbox" checked={sauces.includes(sauce)} disabled={!sauces.includes(sauce) && sauces.length >= 2} onChange={() => toggleSauce(sauce)} /><span>{sauce}</span></label>)}
              </div>
            </fieldset>}

            {options.removableIngredients.length > 0 && <fieldset>
              <legend>¿Quieres quitar algo? <small>opcional</small></legend>
              <div className="product-option-chips product-option-chips--remove">
                {options.removableIngredients.map((ingredient) => <label key={ingredient} data-selected={removedIngredients.includes(ingredient)}><input type="checkbox" checked={removedIngredients.includes(ingredient)} onChange={() => toggleRemovedIngredient(ingredient)} /><span>Sin {ingredient.toLowerCase()}</span></label>)}
              </div>
            </fieldset>}
          </div>

          <div className="product-dialog__quantity">
            <span>Cantidad</span>
            <div><button type="button" onClick={() => { setQuantity((current) => Math.max(1, current - 1)); setAdded(false); }} aria-label="Reducir cantidad"><Minus aria-hidden="true" /></button><strong>{quantity}</strong><button type="button" onClick={() => { setQuantity((current) => Math.min(20, current + 1)); setAdded(false); }} aria-label="Aumentar cantidad"><Plus aria-hidden="true" /></button></div>
          </div>
          <div className="product-dialog__meta">
            {item.allergens.length > 0 && <p><strong>Alérgenos</strong>{item.allergens.join(" · ")}</p>}
          </div>
          <button className="primary-button product-dialog__cart" type="button" onClick={addToCart} data-added={added}>{added ? <Check aria-hidden="true" /> : <ShoppingCart aria-hidden="true" />}{added ? "Agregado al carrito" : `Añadir · ${totalPrice}`}</button>
          {dineInTable ? <p className="product-dialog__table-note"><UtensilsCrossed aria-hidden="true" /><span><strong>Pedido para {dineInTable.name}</strong>Agrega el producto al carrito y envíalo directamente a cocina.</span></p> : <a className="whatsapp-button" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noreferrer">Ordenar por WhatsApp</a>}
        </div>
      </div>
      <div className="product-dialog__mobile-action" aria-live="polite">
        <span><small>{quantity === 1 ? "1 producto" : `${quantity} productos`}</small><strong>{totalPrice}</strong></span>
        <button className="primary-button product-dialog__mobile-cart" type="button" onClick={addToCart} data-added={added}>{added ? <Check aria-hidden="true" /> : <ShoppingCart aria-hidden="true" />}<span>{added ? "Agregado" : "Añadir"}</span></button>
      </div>
    </dialog>
  );
}
