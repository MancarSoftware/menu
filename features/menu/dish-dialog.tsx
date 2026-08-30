"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check, Flame, Minus, Plus, ShoppingCart, Sparkles, X } from "lucide-react";
import { useCart } from "@/features/cart/cart-context";
import type { MenuItemView } from "@/lib/domain";
import { formatPrice } from "@/lib/format";

export function DishDialog({ item, onClose, whatsapp }: { item: MenuItemView | null; onClose: () => void; whatsapp: string }) {
  const { addItem } = useCart();
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (item && dialog && !dialog.open) {
      setQuantity(1);
      setAdded(false);
      dialog.showModal();
      requestAnimationFrame(() => closeRef.current?.focus());
    }
    if (!item && dialog?.open) dialog.close();
  }, [item]);

  function addToCart() {
    if (!item) return;
    addItem(item, quantity);
    setAdded(true);
  }

  return (
    <dialog ref={ref} className="product-dialog" onClose={onClose} onClick={(event) => { if (event.target === ref.current) ref.current.close(); }} aria-labelledby="product-dialog-title">
      {item && <div className="product-dialog__panel">
        <button ref={closeRef} className="product-dialog__close" type="button" autoFocus onClick={() => ref.current?.close()} aria-label="Cerrar detalle"><X aria-hidden="true" /></button>
        <div className="product-dialog__image"><Image src={item.imageUrl} alt={item.name} fill sizes="(max-width: 760px) 100vw, 50vw" priority /></div>
        <div className="product-dialog__content">
          <div className="product-dialog__badges">
            {item.isChefRecommendation && <span><Sparkles aria-hidden="true" /> Recomendado</span>}
            {item.spicyLevel ? <span><Flame aria-hidden="true" /> Picante {item.spicyLevel}/3</span> : null}
          </div>
          <h2 id="product-dialog-title">{item.name}</h2>
          <p className="product-dialog__description">{item.description}</p>
          <p className="product-dialog__price"><span>Precio</span>{formatPrice(item.priceCents)}</p>
          <div className="product-dialog__quantity">
            <span>Cantidad</span>
            <div><button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} aria-label="Reducir cantidad"><Minus aria-hidden="true" /></button><strong>{quantity}</strong><button type="button" onClick={() => setQuantity((current) => Math.min(20, current + 1))} aria-label="Aumentar cantidad"><Plus aria-hidden="true" /></button></div>
          </div>
          <div className="product-dialog__meta">
            {item.ingredients.length > 0 && <p><strong>Ingredientes</strong>{item.ingredients.join(" · ")}</p>}
            {item.allergens.length > 0 && <p><strong>Alérgenos</strong>{item.allergens.join(" · ")}</p>}
          </div>
          <button className="primary-button product-dialog__cart" type="button" onClick={addToCart} data-added={added}>{added ? <Check aria-hidden="true" /> : <ShoppingCart aria-hidden="true" />}{added ? "Agregado al carrito" : "Añadir al carrito"}</button>
          <a className="whatsapp-button" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola, quisiera ordenar ${quantity} × ${item.name}.`)}`} target="_blank" rel="noreferrer">Ordenar por WhatsApp</a>
        </div>
      </div>}
    </dialog>
  );
}
