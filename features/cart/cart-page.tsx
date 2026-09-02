"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bike, Clock3, MapPin, Minus, Plus, ShoppingBag, Store, Trash2, UtensilsCrossed } from "lucide-react";
import { useRef, useState } from "react";
import type { OrderView } from "@/lib/domain";
import { formatPrice } from "@/lib/format";
import { activeOrderStatusLabel, useCart } from "./cart-context";

const deliveryFeeCents = 250;
type Fulfillment = "delivery" | "pickup" | "dine-in";
type DineInTable = { number: number; name: string } | null;

export function CartPage({ pickupAddress, city, dineInTable }: { whatsapp: string; pickupAddress: string; city: string; dineInTable: DineInTable }) {
  const router = useRouter();
  const { activeOrders, entries, isReady, totalCents, updateQuantity, clearCart, rememberOrder } = useCart();
  const [fulfillment, setFulfillment] = useState<Fulfillment>(dineInTable ? "dine-in" : "delivery");
  const [address, setAddress] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef("");
  const serviceFeeCents = fulfillment === "delivery" ? deliveryFeeCents : 0;
  const finalTotal = entries.length ? totalCents + serviceFeeCents : 0;
  const canOrder = entries.length > 0 && customerName.trim().length >= 2 && /^\+?[0-9\s-]{7,20}$/.test(customerPhone.trim()) && (fulfillment !== "delivery" || address.trim().length >= 8);

  async function submitDineInOrder() {
    if (!dineInTable || pending || !entries.length) return;
    setPending(true);
    setError("");
    if (!requestId.current) requestId.current = crypto.randomUUID();
    try {
      const response = await fetch("/api/dine-in/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientRequestId: requestId.current,
          notes: notes.trim(),
          items: entries.map((entry) => ({ productId: entry.product.id, quantity: entry.quantity, customizationKey: entry.customization.key })),
        }),
      });
      const body = await response.json() as { order?: OrderView; error?: string };
      if (!response.ok || !body.order) throw new Error(body.error ?? "No pudimos enviar el pedido a cocina.");
      rememberOrder(body.order);
      clearCart();
      router.push(`/pedido/${body.order.publicId}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos enviar el pedido a cocina.");
    } finally {
      setPending(false);
    }
  }

  async function submitPublicOrder() {
    if (!canOrder || pending || fulfillment === "dine-in") return;
    setPending(true); setError("");
    if (!requestId.current) requestId.current = crypto.randomUUID();
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientRequestId: requestId.current,
          mode: fulfillment === "delivery" ? "DELIVERY" : "PICKUP",
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          deliveryAddress: fulfillment === "delivery" ? address.trim() : "",
          notes: notes.trim(),
          items: entries.map((entry) => ({ productId: entry.product.id, quantity: entry.quantity, customizationKey: entry.customization.key })),
        }),
      });
      const body = await response.json() as { order?: OrderView; error?: string };
      if (!response.ok || !body.order) throw new Error(body.error ?? "No pudimos registrar el pedido.");
      rememberOrder(body.order);
      clearCart();
      router.push(`/pedido/${body.order.publicId}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No pudimos registrar el pedido."); }
    finally { setPending(false); }
  }

  if (!isReady) return <main id="contenido" className="fast-page cart-page cart-empty" aria-busy="true"><p role="status">Recuperando tu pedido…</p></main>;

  if (!entries.length) {
    return <main id="contenido" className="fast-page cart-page cart-empty"><ShoppingBag aria-hidden="true" /><h1>{activeOrders.length ? "Tus pedidos siguen aquí" : "Tu carrito está vacío"}</h1><p>{activeOrders.length ? "Puedes volver a consultar su estado aunque cambies de sección o recargues la página." : "Agrega una hamburguesa, pizza o combo para comenzar."}</p>{activeOrders.length > 0 && <div className="cart-saved-orders">{activeOrders.map((order) => <Link key={order.publicId} href={`/pedido/${order.publicId}`}><span><strong>Pedido #{order.orderNumber}</strong><small>{order.mode === "DINE_IN" && order.tableNumber ? `Mesa ${order.tableNumber} · ` : ""}{activeOrderStatusLabel(order.status)}</small></span><Clock3 aria-hidden="true" /></Link>)}</div>}<Link className="primary-button" href="/menu">{activeOrders.length ? "Pedir algo más" : "Explorar el menú"}</Link></main>;
  }

  return (
    <main id="contenido" className="fast-page cart-page">
      <div className="cart-title"><h1>Tu pedido</h1><button type="button" onClick={clearCart}><Trash2 aria-hidden="true" /> Vaciar</button></div>
      <div className="cart-items">
        {entries.map((entry) => {
          const unitPriceCents = entry.product.priceCents + entry.customization.extraPriceCents;
          const lineTotalCents = unitPriceCents * entry.quantity;
          return <article className="cart-item" key={entry.lineId}>
            <span className="cart-item__image"><Image src={entry.product.imageUrl} alt="" fill sizes="72px" /></span>
            <span><strong>{entry.product.name}</strong>{entry.customization.labels.length > 0 && <small>{entry.customization.labels.join(" · ")}</small>}<b>{formatPrice(lineTotalCents)}</b></span>
            <div className="quantity-control"><button type="button" onClick={() => updateQuantity(entry.lineId, entry.quantity - 1)} aria-label={`Quitar una unidad de ${entry.product.name}`}><Minus aria-hidden="true" /></button><strong>{entry.quantity}</strong><button type="button" onClick={() => updateQuantity(entry.lineId, Math.min(20, entry.quantity + 1))} aria-label={`Agregar una unidad de ${entry.product.name}`}><Plus aria-hidden="true" /></button></div>
          </article>;
        })}
      </div>

      <section className="fulfillment" aria-labelledby="fulfillment-title">
        <div className="fulfillment__heading"><span>02</span><div><h2 id="fulfillment-title">{dineInTable ? "Pedido en tu mesa" : "¿Cómo lo quieres?"}</h2><p>{dineInTable ? "El QR vinculó este pedido con tu mesa." : "Elige antes de confirmar tu pedido."}</p></div></div>
        <div className="fulfillment__choices" role="group" aria-label="Modalidad del pedido">
          {dineInTable ? <div className="fulfillment__locked"><UtensilsCrossed aria-hidden="true" /><span><strong>Servicio en mesa</strong><small>{dineInTable.name} · Mesa {dineInTable.number}</small></span><b>Confirmado</b></div> : <>
            <button type="button" aria-pressed={fulfillment === "delivery"} onClick={() => setFulfillment("delivery")}><Bike aria-hidden="true" /><span><strong>Delivery</strong><small>Lo llevamos a tu dirección</small></span><b>+{formatPrice(deliveryFeeCents)}</b></button>
            <button type="button" aria-pressed={fulfillment === "pickup"} onClick={() => setFulfillment("pickup")}><Store aria-hidden="true" /><span><strong>Retiro</strong><small>Recógelo en el local</small></span><b>Gratis</b></button>
          </>}
        </div>

        {fulfillment !== "dine-in" && <div className="checkout-fields checkout-fields--customer"><label>Nombre<input required minLength={2} maxLength={100} value={customerName} onChange={(event) => setCustomerName(event.target.value)} autoComplete="name" /></label><label>Teléfono<input required inputMode="tel" minLength={7} maxLength={20} value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value.replace(/[^0-9+\s-]/g, ""))} autoComplete="tel" /></label></div>}
        {fulfillment === "delivery" ? <div className="checkout-fields">
          <label>Dirección de envío<input required minLength={8} maxLength={240} value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Calle, número y referencia" autoComplete="street-address" /></label>
        </div> : fulfillment === "pickup" ? <div className="pickup-note"><MapPin aria-hidden="true" /><span><strong>Retira en {city}</strong><small>{pickupAddress}</small></span><span><Clock3 aria-hidden="true" /> Verás aquí cada cambio de estado</span></div> : <div className="pickup-note dine-in-note"><UtensilsCrossed aria-hidden="true" /><span><strong>Pedido para {dineInTable?.name}</strong><small>La cocina recibirá directamente tu orden.</small></span><span><Clock3 aria-hidden="true" /> Verás aquí cada cambio de estado</span></div>}
      </section>

      <div className="checkout-fields">
        <label>Instrucciones o comentarios<textarea maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Sin cebolla, por favor" rows={2} /></label>
      </div>

      <div className="cart-total"><span>Total <small>{fulfillment === "delivery" ? "incluye delivery" : fulfillment === "dine-in" ? "pedido en mesa" : "sin costo de retiro"}</small></span><strong>{formatPrice(finalTotal)}</strong></div>
      {error && <p className="checkout-error" role="alert">{error}</p>}

      {fulfillment === "dine-in" ? <button className="primary-button checkout-button" type="button" disabled={pending} onClick={submitDineInOrder}>{pending ? "Enviando a cocina…" : `Enviar a cocina · ${formatPrice(finalTotal)}`}</button> : <button className="whatsapp-button checkout-button" type="button" disabled={!canOrder || pending} onClick={submitPublicOrder}>{pending ? "Registrando pedido…" : canOrder ? `Confirmar pedido · ${formatPrice(finalTotal)}` : "Completa tus datos para ordenar"}</button>}
    </main>
  );
}
