"use client";

import { Ban, ChefHat, Check, Clock3, ReceiptText, UtensilsCrossed } from "lucide-react";
import { useEffect, useState } from "react";
import type { OrderStatus, OrderView } from "@/lib/domain";
import { formatPrice } from "@/lib/format";
import { requestJson } from "./admin-api";

const columns: { status: OrderStatus; label: string }[] = [
  { status: "RECEIVED", label: "Nuevos" },
  { status: "PREPARING", label: "En cocina" },
  { status: "READY", label: "Listos" },
  { status: "SERVED", label: "En mesa" },
];

const nextActions: Partial<Record<OrderStatus, { status: OrderStatus; label: string; icon: typeof Check }>> = {
  RECEIVED: { status: "PREPARING", label: "Empezar", icon: ChefHat },
  PREPARING: { status: "READY", label: "Marcar listo", icon: Check },
  READY: { status: "SERVED", label: "Marcar servido", icon: UtensilsCrossed },
  SERVED: { status: "PAID", label: "Cobrar efectivo", icon: ReceiptText },
};

export function KitchenBoard({ initialOrders }: { initialOrders: OrderView[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [message, setMessage] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);

  useEffect(() => setOrders(initialOrders), [initialOrders]);
  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const result = await requestJson<{ orders: OrderView[] }>("/api/admin/orders");
        setOrders(result.orders); setMessage("");
      } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos actualizar los pedidos."); }
    }, 10000);
    return () => window.clearInterval(interval);
  }, []);

  async function advance(order: OrderView, status: OrderStatus) {
    setPendingId(order.id); setMessage("");
    try {
      const result = await requestJson<{ order: OrderView }>(`/api/admin/orders/${order.id}`, "PATCH", { status, ...(status === "PAID" ? { paymentMethod: "CASH" } : {}) });
      setOrders((current) => ["PAID", "CANCELLED"].includes(result.order.status) ? current.filter((candidate) => candidate.id !== order.id) : current.map((candidate) => candidate.id === order.id ? result.order : candidate));
    } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos actualizar el pedido."); }
    finally { setPendingId(null); }
  }

  return <section className="kitchen-admin">
    <header className="kitchen-admin__header"><div><p className="eyebrow">Operación en vivo</p><h2>Comandas del salón</h2></div><span><Clock3 aria-hidden="true" /> Actualización automática cada 10 s</span></header>
    {message && <p className="admin-inline-message" role="status">{message}</p>}
    <div className="kitchen-columns">{columns.map((column) => {
      const columnOrders = orders.filter((order) => order.status === column.status);
      return <section className="kitchen-column" key={column.status} data-status={column.status}>
        <header><h3>{column.label}</h3><span>{columnOrders.length}</span></header>
        <div>{columnOrders.length ? columnOrders.map((order) => {
          const action = nextActions[order.status];
          const ActionIcon = action?.icon ?? Check;
          return <article className="kitchen-ticket" key={order.id}>
            <header><strong>#{order.id}</strong><span>Mesa {order.table?.number}</span><time>{new Date(order.createdAt).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}</time></header>
            <div className="kitchen-ticket__items">{order.items.map((item) => <div key={item.id}><span><b>{item.quantity}×</b> {item.productName}{item.customization.length > 0 && <small>{item.customization.join(" · ")}</small>}</span><strong>{formatPrice(item.lineTotalCents)}</strong></div>)}</div>
            {order.notes && <p>Nota: {order.notes}</p>}
            <footer>{action && <button className="button button--solid" disabled={pendingId === order.id} onClick={() => advance(order, action.status)}><ActionIcon aria-hidden="true" />{action.label}</button>}{["RECEIVED", "PREPARING"].includes(order.status) && <button className="icon-button icon-button--danger" disabled={pendingId === order.id} onClick={() => advance(order, "CANCELLED")} aria-label={`Cancelar pedido ${order.id}`}><Ban aria-hidden="true" /></button>}</footer>
          </article>;
        }) : <p className="kitchen-empty">Sin pedidos aquí.</p>}</div>
      </section>;
    })}</div>
  </section>;
}
