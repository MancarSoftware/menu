"use client";

import Image from "next/image";
import Link from "next/link";
import { Bike, Clock3, MapPin, Minus, Plus, ShoppingBag, Store, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/format";
import { useCart } from "./cart-context";

const deliveryFeeCents = 250;
type Fulfillment = "delivery" | "pickup";

export function CartPage({ whatsapp, pickupAddress, city }: { whatsapp: string; pickupAddress: string; city: string }) {
  const { entries, totalCents, updateQuantity, clearCart } = useCart();
  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const serviceFeeCents = fulfillment === "delivery" ? deliveryFeeCents : 0;
  const finalTotal = entries.length ? totalCents + serviceFeeCents : 0;
  const canOrder = entries.length > 0 && (fulfillment === "pickup" || address.trim().length >= 8);

  const orderUrl = useMemo(() => {
    const lines = entries.flatMap((entry) => {
      const unitPriceCents = entry.product.priceCents + entry.customization.extraPriceCents;
      return [
        `• ${entry.quantity} × ${entry.product.name} — ${formatPrice(unitPriceCents * entry.quantity)}`,
        ...entry.customization.labels.map((label) => `  ${label}`),
      ];
    });
    const serviceLines = fulfillment === "delivery"
      ? [`Modalidad: Delivery`, `Envío: ${formatPrice(deliveryFeeCents)}`, `Dirección: ${address.trim()}`]
      : [`Modalidad: Retiro en el local`, `Retiro en: ${pickupAddress}, ${city}`];
    const message = ["Hola, quisiera hacer este pedido:", "", ...lines, "", ...serviceLines, `Total: ${formatPrice(finalTotal)}`, notes.trim() ? `Instrucciones: ${notes.trim()}` : ""].filter(Boolean).join("\n");
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
  }, [address, city, entries, finalTotal, fulfillment, notes, pickupAddress, whatsapp]);

  if (!entries.length) {
    return <main id="contenido" className="fast-page cart-page cart-empty"><ShoppingBag aria-hidden="true" /><h1>Tu carrito está vacío</h1><p>Agrega una hamburguesa, pizza o combo para comenzar.</p><Link className="primary-button" href="/menu">Explorar el menú</Link></main>;
  }

  return (
    <main id="contenido" className="fast-page cart-page">
      <div className="cart-title"><h1>Tu pedido</h1><button type="button" onClick={clearCart}><Trash2 aria-hidden="true" /> Vaciar</button></div>
      <div className="cart-items">
        {entries.map((entry) => {
          const unitPriceCents = entry.product.priceCents + entry.customization.extraPriceCents;
          return <article className="cart-item" key={entry.lineId}>
            <span className="cart-item__image"><Image src={entry.product.imageUrl} alt="" fill sizes="72px" /></span>
            <span><strong>{entry.product.name}</strong>{entry.customization.labels.length > 0 && <small>{entry.customization.labels.join(" · ")}</small>}<b>{formatPrice(unitPriceCents)}</b></span>
            <div className="quantity-control"><button type="button" onClick={() => updateQuantity(entry.lineId, entry.quantity - 1)} aria-label={`Quitar una unidad de ${entry.product.name}`}><Minus aria-hidden="true" /></button><strong>{entry.quantity}</strong><button type="button" onClick={() => updateQuantity(entry.lineId, Math.min(20, entry.quantity + 1))} aria-label={`Agregar una unidad de ${entry.product.name}`}><Plus aria-hidden="true" /></button></div>
          </article>;
        })}
      </div>

      <section className="fulfillment" aria-labelledby="fulfillment-title">
        <div className="fulfillment__heading"><span>02</span><div><h2 id="fulfillment-title">¿Cómo lo quieres?</h2><p>Elige antes de enviar tu pedido.</p></div></div>
        <div className="fulfillment__choices" role="group" aria-label="Modalidad del pedido">
          <button type="button" aria-pressed={fulfillment === "delivery"} onClick={() => setFulfillment("delivery")}><Bike aria-hidden="true" /><span><strong>Delivery</strong><small>Lo llevamos a tu dirección</small></span><b>+{formatPrice(deliveryFeeCents)}</b></button>
          <button type="button" aria-pressed={fulfillment === "pickup"} onClick={() => setFulfillment("pickup")}><Store aria-hidden="true" /><span><strong>Retiro</strong><small>Recógelo en el local</small></span><b>Gratis</b></button>
        </div>

        {fulfillment === "delivery" ? <div className="checkout-fields">
          <label>Dirección de envío<input required minLength={8} maxLength={240} value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Calle, número y referencia" autoComplete="street-address" /></label>
        </div> : <div className="pickup-note"><MapPin aria-hidden="true" /><span><strong>Retira en {city}</strong><small>{pickupAddress}</small></span><span><Clock3 aria-hidden="true" /> Te confirmaremos la hora por WhatsApp</span></div>}
      </section>

      <div className="checkout-fields">
        <label>Instrucciones o comentarios<textarea maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Sin cebolla, por favor" rows={2} /></label>
      </div>

      <div className="cart-total"><span>Total <small>{fulfillment === "delivery" ? "incluye delivery" : "sin costo de retiro"}</small></span><strong>{formatPrice(finalTotal)}</strong></div>

      {canOrder ? <a className="whatsapp-button checkout-button" href={orderUrl} target="_blank" rel="noreferrer">Confirmar por WhatsApp · {formatPrice(finalTotal)}</a> : <button className="whatsapp-button checkout-button" type="button" disabled>Escribe tu dirección para ordenar</button>}
    </main>
  );
}
