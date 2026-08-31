"use client";

import Link from "next/link";
import { Check, ChefHat, CircleDot, Clock3, ReceiptText, UtensilsCrossed } from "lucide-react";
import { useEffect, useState } from "react";
import type { OrderStatus, OrderView } from "@/lib/domain";
import { formatPrice } from "@/lib/format";

const steps: { status: OrderStatus; label: string; icon: typeof Check }[] = [
  { status: "RECEIVED", label: "Recibido", icon: ReceiptText },
  { status: "PREPARING", label: "En cocina", icon: ChefHat },
  { status: "READY", label: "Listo", icon: Check },
  { status: "SERVED", label: "Servido", icon: UtensilsCrossed },
];

export function OrderStatusView({ initialOrder }: { initialOrder: OrderView }) {
  const [order, setOrder] = useState(initialOrder);
  const [connectionMessage, setConnectionMessage] = useState("");

  useEffect(() => {
    if (["PAID", "CANCELLED"].includes(order.status)) return;
    const interval = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/dine-in/orders/${order.publicId}`, { cache: "no-store" });
        const body = await response.json() as { order?: OrderView };
        if (response.ok && body.order) {
          setOrder(body.order);
          setConnectionMessage("");
        } else {
          setConnectionMessage("No pudimos actualizar el estado. Volveremos a intentarlo.");
        }
      } catch {
        setConnectionMessage("Sin conexión. El pedido sigue guardado en cocina.");
      }
    }, 8000);
    return () => window.clearInterval(interval);
  }, [order.publicId, order.status]);

  const currentIndex = steps.findIndex((step) => step.status === order.status);
  const isCancelled = order.status === "CANCELLED";

  return (
    <main id="contenido" className="fast-page order-status-page">
      <header className="order-status__hero">
        <p className="eyebrow">Pedido #{order.id} · Mesa {order.table?.number}</p>
        <h1>{isCancelled ? "Pedido cancelado" : order.status === "PAID" ? "¡Todo listo!" : "Tu pedido está en marcha"}</h1>
        <p>{isCancelled ? "Consulta al personal si necesitas hacer un nuevo pedido." : "La cocina recibió tu orden. Esta pantalla se actualiza automáticamente."}</p>
      </header>

      {!isCancelled && <ol className="order-progress" aria-label="Estado del pedido">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const active = order.status === "PAID" || index <= currentIndex;
          return <li key={step.status} data-active={active} data-current={index === currentIndex}><span><Icon aria-hidden="true" /></span><strong>{step.label}</strong></li>;
        })}
      </ol>}

      <section className="order-receipt">
        <div className="order-receipt__heading"><ReceiptText aria-hidden="true" /><div><strong>Orden #{order.id}</strong><small>{new Date(order.createdAt).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}</small></div></div>
        <div className="order-receipt__items">{order.items.map((item) => <article key={item.id}><span><strong>{item.quantity} × {item.productName}</strong>{item.customization.length > 0 && <small>{item.customization.join(" · ")}</small>}</span><b>{formatPrice(item.lineTotalCents)}</b></article>)}</div>
        {order.notes && <p className="order-receipt__notes"><CircleDot aria-hidden="true" /> {order.notes}</p>}
        <div className="order-receipt__total"><span>Total</span><strong>{formatPrice(order.totalCents)}</strong></div>
      </section>

      {connectionMessage && <p className="order-connection" role="status"><Clock3 aria-hidden="true" />{connectionMessage}</p>}
      <Link className="primary-button" href="/menu">Pedir algo más</Link>
    </main>
  );
}
