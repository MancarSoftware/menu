"use client";

import Image from "next/image";
import Link from "next/link";
import { Bike, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/format";
import { useCart } from "./cart-context";

const deliveryFeeCents = 5000;

export function CartPage({ whatsapp }: { whatsapp: string }) {
  const { entries, totalCents, updateQuantity, clearCart } = useCart();
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const finalTotal = entries.length ? totalCents + deliveryFeeCents : 0;
  const canOrder = entries.length > 0 && address.trim().length >= 8;

  const orderUrl = useMemo(() => {
    const lines = entries.map((entry) => `• ${entry.quantity} × ${entry.product.name} — ${formatPrice(entry.product.priceCents * entry.quantity)}`);
    const message = [`Hola, quisiera hacer este pedido:`, "", ...lines, "", `Delivery: ${formatPrice(deliveryFeeCents)}`, `Total: ${formatPrice(finalTotal)}`, "", `Dirección: ${address.trim()}`, notes.trim() ? `Instrucciones: ${notes.trim()}` : ""].filter(Boolean).join("\n");
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
  }, [address, entries, finalTotal, notes, whatsapp]);

  if (!entries.length) {
    return <main id="contenido" className="fast-page cart-page cart-empty"><ShoppingBag aria-hidden="true" /><h1>Tu carrito está vacío</h1><p>Agrega una hamburguesa, pizza o combo para comenzar.</p><Link className="primary-button" href="/menu">Explorar el menú</Link></main>;
  }

  return (
    <main id="contenido" className="fast-page cart-page">
      <div className="cart-title"><h1>Tu pedido</h1><button type="button" onClick={clearCart}><Trash2 aria-hidden="true" /> Vaciar</button></div>
      <div className="cart-items">
        {entries.map((entry) => <article className="cart-item" key={entry.product.id}>
          <span className="cart-item__image"><Image src={entry.product.imageUrl} alt="" fill sizes="72px" /></span>
          <span><strong>{entry.product.name}</strong><b>{formatPrice(entry.product.priceCents)}</b></span>
          <div className="quantity-control"><button type="button" onClick={() => updateQuantity(entry.product.id, entry.quantity - 1)} aria-label={`Quitar una unidad de ${entry.product.name}`}><Minus aria-hidden="true" /></button><strong>{entry.quantity}</strong><button type="button" onClick={() => updateQuantity(entry.product.id, Math.min(20, entry.quantity + 1))} aria-label={`Agregar una unidad de ${entry.product.name}`}><Plus aria-hidden="true" /></button></div>
        </article>)}
        <article className="cart-item cart-delivery"><span className="cart-delivery__icon"><Bike aria-hidden="true" /></span><span><strong>Delivery</strong><b>{formatPrice(deliveryFeeCents)}</b></span></article>
      </div>

      <div className="cart-total"><span>Total</span><strong>{formatPrice(finalTotal)}</strong></div>

      <div className="checkout-fields">
        <label>Dirección de envío<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Tu dirección..." autoComplete="street-address" /></label>
        <label>Instrucciones o comentarios<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Sin cebolla, por favor" rows={2} /></label>
      </div>

      {canOrder ? <a className="whatsapp-button checkout-button" href={orderUrl} target="_blank" rel="noreferrer">Ordenar por WhatsApp</a> : <button className="whatsapp-button checkout-button" type="button" disabled>Escribe tu dirección para ordenar</button>}
    </main>
  );
}
