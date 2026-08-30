"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { ArrowUpRight, Flame, Sparkles, X } from "lucide-react";
import type { MenuItemView } from "@/lib/domain";
import { formatPrice } from "@/lib/format";

export function DishDialog({ item, onClose, whatsapp }: { item: MenuItemView | null; onClose: () => void; whatsapp: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (item && dialog && !dialog.open) {
      dialog.showModal();
      requestAnimationFrame(() => closeRef.current?.focus());
    }
    if (!item && dialog?.open) dialog.close();
  }, [item]);

  return (
    <dialog ref={ref} className="dish-dialog" onClose={onClose} onClick={(event) => { if (event.target === ref.current) ref.current.close(); }} aria-labelledby="dish-dialog-title">
      {item && (
        <div className="dish-dialog__panel">
          <button ref={closeRef} className="dish-dialog__close" type="button" autoFocus onClick={() => ref.current?.close()} aria-label="Cerrar detalle"><X aria-hidden="true" /></button>
          <div className="dish-dialog__image">
            <Image src={item.imageUrl} alt={item.name} fill sizes="(max-width: 700px) 100vw, 52vw" priority />
            <span className="dish-dialog__category eyebrow">{item.categoryName}</span>
          </div>
          <div className="dish-dialog__content">
            <div className="dish-dialog__topline">
              {item.isChefRecommendation && <span><Sparkles aria-hidden="true" /> Selección del chef</span>}
              {item.spicyLevel ? <span><Flame aria-hidden="true" /> Picante {item.spicyLevel}/3</span> : null}
            </div>
            <h2 id="dish-dialog-title">{item.name}</h2>
            <p className="dish-dialog__description">{item.description}</p>
            <p className="dish-dialog__price">{formatPrice(item.priceCents)}</p>
            <div className="dish-dialog__details">
              <div><h3>Ingredientes</h3><p>{item.ingredients.join(" · ") || "Consulta la preparación con nuestro equipo."}</p></div>
              <div><h3>Preferencias</h3><p>{item.dietaryTags.join(" · ") || "Sin etiquetas dietarias"}</p></div>
              <div><h3>Alérgenos</h3><p>{item.allergens.join(" · ") || "Sin alérgenos declarados"}</p></div>
            </div>
            <p className="dish-dialog__notice">Si tienes una alergia severa, avisa al equipo antes de ordenar. Nuestra cocina manipula diversos ingredientes.</p>
            <a className="button button--solid dish-dialog__order" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola, quisiera consultar por ${item.name}.`)}`} target="_blank" rel="noreferrer">Consultar por WhatsApp <ArrowUpRight aria-hidden="true" /></a>
          </div>
        </div>
      )}
    </dialog>
  );
}
