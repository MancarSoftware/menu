"use client";

import { Ban, BellRing, ChefHat, Check, ReceiptText, UtensilsCrossed, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { OrderStatus, OrderView, PaymentMethod, StaffRole } from "@/lib/domain";
import { formatPrice } from "@/lib/format";
import { requestJson } from "./admin-api";

const columns: { status: OrderStatus; label: string }[] = [
  { status: "RECEIVED", label: "Nuevos" }, { status: "PREPARING", label: "En cocina" }, { status: "READY", label: "Listos" }, { status: "SERVED", label: "Entregados" },
];
const nextActions: Partial<Record<OrderStatus, { status: OrderStatus; label: string; icon: typeof Check }>> = {
  RECEIVED: { status: "PREPARING", label: "Empezar", icon: ChefHat }, PREPARING: { status: "READY", label: "Marcar listo", icon: Check }, READY: { status: "SERVED", label: "Marcar entregado", icon: UtensilsCrossed }, SERVED: { status: "PAID", label: "Registrar pago", icon: ReceiptText },
};
const modeLabel = (order: OrderView) => order.mode === "DINE_IN" ? `Mesa ${order.table?.number}` : order.mode === "DELIVERY" ? "Delivery" : "Retiro";

export function KitchenBoard({ initialOrders, role, onPaymentRecorded }: { initialOrders: OrderView[]; role: StaffRole; onPaymentRecorded?: () => void }) {
  const [orders, setOrders] = useState(initialOrders);
  const [message, setMessage] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<OrderView | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const closedOrderIds = useRef(new Set<number>());
  const knownOrderIds = useRef(new Set(initialOrders.map((order) => order.id)));
  const audioContext = useRef<AudioContext | null>(null);
  const refreshInFlight = useRef(false);
  const mutationGeneration = useRef(0);

  const playAlarm = useCallback(async () => {
    if (!audioContext.current) return;
    const audio = audioContext.current;
    if (audio.state === "suspended") await audio.resume();
    const start = audio.currentTime;
    [0, .22].forEach((offset, index) => {
      const oscillator = audio.createOscillator(); const gain = audio.createGain();
      oscillator.type = "sine"; oscillator.frequency.value = index === 0 ? 880 : 1175;
      gain.gain.setValueAtTime(.0001, start + offset); gain.gain.exponentialRampToValueAtTime(.12, start + offset + .02); gain.gain.exponentialRampToValueAtTime(.0001, start + offset + .18);
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(start + offset); oscillator.stop(start + offset + .2);
    });
  }, []);

  async function toggleSound() {
    if (soundEnabled) { setSoundEnabled(false); return; }
    try {
      audioContext.current ??= new AudioContext();
      await audioContext.current.resume();
      setSoundEnabled(true);
      await playAlarm();
      setMessage("");
    } catch { setSoundEnabled(false); setMessage("El navegador bloqueó el sonido. Revisa el volumen y los permisos del sitio."); }
  }

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    const generation = mutationGeneration.current;
    try {
      const result = await requestJson<{ orders: OrderView[] }>("/api/admin/orders");
      if (generation !== mutationGeneration.current) return;
      const visible = result.orders.filter((order) => !closedOrderIds.current.has(order.id));
      const hasNew = visible.some((order) => !knownOrderIds.current.has(order.id));
      if (hasNew && soundEnabled) { try { await playAlarm(); } catch { setSoundEnabled(false); } }
      if (generation !== mutationGeneration.current) return;
      visible.forEach((order) => knownOrderIds.current.add(order.id));
      setOrders(visible); setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos actualizar los pedidos."); }
    finally { refreshInFlight.current = false; }
  }, [playAlarm, soundEnabled]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void refresh(); });
    const interval = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [refresh]);
  useEffect(() => () => { void audioContext.current?.close(); }, []);
  useEffect(() => { if (!message) return; const timeout = window.setTimeout(() => setMessage(""), 5000); return () => window.clearTimeout(timeout); }, [message]);

  async function advance(order: OrderView, status: OrderStatus, method?: PaymentMethod) {
    mutationGeneration.current += 1;
    setPendingId(order.id); setMessage("");
    try {
      const result = await requestJson<{ order: OrderView }>(`/api/admin/orders/${order.id}`, "PATCH", { status, version: order.version, ...(status === "PAID" ? { paymentMethod: method } : {}) });
      mutationGeneration.current += 1;
      if (["PAID", "CANCELLED"].includes(result.order.status)) closedOrderIds.current.add(order.id);
      setOrders((current) => closedOrderIds.current.has(order.id) ? current.filter((candidate) => candidate.id !== order.id) : current.map((candidate) => candidate.id === order.id ? result.order : candidate));
      if (result.order.status === "PAID") { setPaymentOrder(null); onPaymentRecorded?.(); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos actualizar el pedido."); await refresh(); }
    finally { setPendingId(null); }
  }

  return <section className="kitchen-admin">
    <header className="kitchen-admin__header"><div><p className="eyebrow">Operación en vivo</p><h2>Pedidos de todos los canales</h2></div><div className="kitchen-alert-controls"><span><BellRing aria-hidden="true" /> Actualización cada 5 s</span><button type="button" data-active={soundEnabled} onClick={() => void toggleSound()}>{soundEnabled ? <Volume2 /> : <VolumeX />}{soundEnabled ? "Alarma activa" : "Activar alarma"}</button></div></header>
    {message && <p className="admin-inline-message" role="status">{message}</p>}
    <div className="kitchen-columns">{columns.map((column) => {
      const columnOrders = orders.filter((order) => order.status === column.status);
      return <section className="kitchen-column" key={column.status} data-status={column.status}>
        <header><h3>{column.label}</h3><span>{columnOrders.length}</span></header>
        <div>{columnOrders.length ? columnOrders.map((order) => {
          const action = nextActions[order.status]; const ActionIcon = action?.icon ?? Check;
          return <article className="kitchen-ticket" key={order.id} data-new={order.status === "RECEIVED" && !order.acknowledgedAt}>
            <header><strong>#{order.orderNumber}</strong><span>{modeLabel(order)}</span><time>{new Date(order.createdAt).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}</time></header>
            {order.status === "RECEIVED" && !order.acknowledgedAt && <div className="kitchen-ticket__new"><BellRing />Nuevo pedido</div>}
            <div className="kitchen-ticket__items">{order.items.map((item) => <div key={item.id}><span><b>{item.quantity}×</b> {item.productName}{item.customization.length > 0 && <small>{item.customization.join(" · ")}</small>}</span><strong>{formatPrice(item.lineTotalCents)}</strong></div>)}</div>
            {order.customerName && <p>{order.customerName} · {order.customerPhone}</p>}{order.deliveryAddress && <p>Entrega: {order.deliveryAddress}</p>}{order.notes && <p>Nota: {order.notes}</p>}
            <footer>{action && (action.status !== "PAID" || ["ADMIN", "CASHIER"].includes(role)) && <button className="button button--solid" disabled={pendingId === order.id} onClick={() => action.status === "PAID" ? setPaymentOrder(order) : advance(order, action.status)}><ActionIcon aria-hidden="true" />{action.label}</button>}{["RECEIVED", "PREPARING"].includes(order.status) && <button className="icon-button icon-button--danger" disabled={pendingId === order.id} onClick={() => advance(order, "CANCELLED")} aria-label={`Cancelar pedido ${order.orderNumber}`}><Ban /></button>}</footer>
          </article>;
        }) : <p className="kitchen-empty">Sin pedidos aquí.</p>}</div>
      </section>;
    })}</div>
    {paymentOrder && <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="payment-title"><div className="admin-modal__panel"><button className="admin-modal__close" onClick={() => setPaymentOrder(null)} aria-label="Cerrar"><X /></button><p className="eyebrow">Pedido #{paymentOrder.orderNumber}</p><h2 id="payment-title">Registrar pago</h2><strong className="admin-payment-total">{formatPrice(paymentOrder.totalCents)}</strong><div className="admin-payment-methods">{(["CASH", "CARD", "TRANSFER"] as PaymentMethod[]).map((method) => <button key={method} data-active={paymentMethod === method} onClick={() => setPaymentMethod(method)}>{method === "CASH" ? "Efectivo" : method === "CARD" ? "Tarjeta" : "Transferencia"}</button>)}</div><p className="admin-form-help">Los cobros en efectivo requieren una caja abierta.</p><button className="button button--solid button--large" disabled={pendingId === paymentOrder.id} onClick={() => advance(paymentOrder, "PAID", paymentMethod)}><ReceiptText />Confirmar pago</button></div></div>}
  </section>;
}
