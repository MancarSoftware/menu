"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ClipboardCheck, MapPinned, Phone, Printer, RefreshCw, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import type { DeliveryOrderView, PaymentMethod } from "@/lib/domain";
import { deliveryDirectionsUrl, deliveryStatusLabel } from "@/lib/delivery";
import { formatPrice } from "@/lib/format";
import { paymentMethodLabels } from "@/lib/payment-labels";
import { requestJson, SessionExpiredError } from "./admin-api";

type DeliveryFeed = { orders: DeliveryOrderView[]; drivers: { id: string; name: string }[]; canCollectCash: boolean; allowedPaymentMethods: PaymentMethod[]; total: number; page: number; pageSize: number };

export function DeliveryBoard({ manager }: { manager: boolean }) {
  const router = useRouter();
  const [feed, setFeed] = useState<DeliveryFeed>({ orders: [], drivers: [], canCollectCash: false, allowedPaymentMethods: [], total: 0, page: 1, pageSize: 20 });
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<"active" | "history">("active");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [verified, setVerified] = useState(false);
  const query = new URLSearchParams({ view, ...(date && view === "history" ? { date } : {}), page: String(page) }).toString();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<number | null>(null);
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const latestRequest = useRef(0);
  const invalidateRequests = useCallback(() => { latestRequest.current++; }, []);

  const refresh = useCallback(async () => {
    const current = generation.current;
    const request = ++latestRequest.current;
    try {
      const result = await requestJson<DeliveryFeed>(`/api/admin/deliveries?${query}`);
      if (current !== generation.current || request !== latestRequest.current) return;
      setFeed(result); setLoaded(true); setError("");
    } catch (reason) {
      if (current !== generation.current || request !== latestRequest.current) return;
      if (reason instanceof SessionExpiredError) router.replace("/admin/login");
      setError(reason instanceof Error ? reason.message : "No pudimos actualizar los repartos.");
    }
  }, [query, router]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void refresh(); });
    const interval = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => { active = false; invalidateRequests(); window.clearInterval(interval); window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); };
  }, [invalidateRequests, refresh]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 5000); return () => window.clearTimeout(timer); }, [notice]);

  function changeView(next: "active" | "history") {
    if (next === view || pending !== null) return;
    generation.current++; setView(next); setPage(1); setLoaded(false); setPaymentId(null);
  }

  async function act(order: DeliveryOrderView, action: "ASSIGN" | "DISPATCH" | "DELIVER" | "PAYMENT", driverId?: string) {
    if (busy.current) return;
    busy.current = true; generation.current++; setPending(order.id); setNotice("");
    let failure = "";
    try {
      if (action === "PAYMENT") await requestJson(`/api/admin/orders/${order.id}`, "PATCH", { version: order.version, status: "PAID", paymentMethod });
      else await requestJson(`/api/admin/deliveries/${order.id}`, "PATCH", { action, version: order.version, ...(driverId ? { driverId } : {}) });
      setPaymentId(null);
      setNotice(action === "PAYMENT" ? "Cobro registrado. Puedes consultar el pedido en Completadas." : "Reparto actualizado.");
    } catch (reason) { failure = reason instanceof Error ? reason.message : "No pudimos actualizar este reparto."; }
    finally {
      generation.current++;
      await refresh();
      if (failure) setNotice(failure);
      setPending(null); busy.current = false;
    }
  }

  return <section className="delivery-board">
    <header className="delivery-board__header"><div><p className="eyebrow">{manager ? "Despacho y seguimiento" : "Tu ruta de trabajo"}</p><h2>{manager ? "Repartos del local" : view === "history" ? "Entregas completadas" : "Entregas pendientes"}</h2><p>{view === "history" ? "Tus entregas y comprobantes, incluso después del cobro." : "Asignación → En camino → Entregado → Cobrado"}</p></div><button type="button" className="button button--line" onClick={() => void refresh()}><RefreshCw aria-hidden="true" />Actualizar</button></header>
    <div className="delivery-board__tabs" role="group" aria-label="Ver entregas"><button type="button" disabled={pending !== null} aria-pressed={view === "active"} onClick={() => changeView("active")}>Pendientes</button><button type="button" disabled={pending !== null} aria-pressed={view === "history"} onClick={() => changeView("history")}>Completadas</button>{view === "history" && <label>Fecha de entrega<input type="date" value={date} disabled={pending !== null} onChange={(event) => { setDate(event.target.value); setPage(1); setLoaded(false); setPaymentId(null); }} /></label>}{date && view === "history" && <button type="button" disabled={pending !== null} onClick={() => { setDate(""); setPage(1); setLoaded(false); }}>Todas las fechas</button>}</div>
    {loaded && <p className="delivery-board__count">{feed.total} {view === "history" ? feed.total === 1 ? "entrega completada" : "entregas completadas" : feed.total === 1 ? "pedido pendiente" : "pedidos pendientes"} · Actualización automática cada 5 s</p>}
    {error && <p className="admin-inline-message" role="alert">{error} <a href="/admin/login">Revisar acceso</a></p>}
    {notice && <p className="admin-inline-message" role="status">{notice}</p>}
    {!loaded && !error && <p role="status">Cargando repartos…</p>}
    {manager && view === "active" && loaded && !feed.drivers.length && <p className="admin-inline-message">Crea un usuario con el rol «Repartidor» en Equipo para asignar pedidos.</p>}
    {loaded && !feed.orders.length && <div className="delivery-board__empty"><ClipboardCheck aria-hidden="true" /><strong>{view === "history" ? "Sin entregas en este período" : "Todo al día"}</strong><p>{view === "history" ? "Las entregas finalizadas se guardan aquí. Prueba otra fecha." : manager ? "No hay repartos pendientes." : "Cuando caja te asigne un pedido, aparecerá aquí. Revisa Completadas para consultar tus entregas anteriores."}</p></div>}
    <div className="delivery-board__list">{loaded && feed.orders.map((order) => {
      const directions = deliveryDirectionsUrl(order);
      const cooking = ["RECEIVED", "PREPARING"].includes(order.status);
      return <article className="delivery-ticket" key={order.id}>
        <header><div><p className="eyebrow">{view === "history" && order.deliveredAt ? "Entregado " : "Pedido "}{new Date(view === "history" ? order.deliveredAt ?? order.createdAt : order.createdAt).toLocaleDateString("es-EC", { timeZone: "America/Guayaquil" })}</p><h3>Pedido #{order.orderNumber}</h3></div><span className="delivery-ticket__status" data-status={order.deliveryStatus}>{cooking ? "En cocina" : deliveryStatusLabel(order.deliveryStatus)}</span></header>
        <p><strong>{order.customerName ?? "Cliente"}</strong>{order.customerPhone && <a className="delivery-ticket__phone" href={`tel:${order.customerPhone.replace(/[^+0-9]/g, "")}`}><Phone aria-hidden="true" />{order.customerPhone}</a>}</p>
        <p>{order.deliveryAddress || "Entrega en el punto confirmado del mapa."}</p>
        {directions ? <a className="button button--line" href={directions} target="_blank" rel="noopener noreferrer"><MapPinned aria-hidden="true" />Abrir ruta en Google Maps</a> : <p className="admin-inline-message">Pedido anterior sin ubicación. Contacta al cliente antes de salir.</p>}
        {order.deliveryLatitude == null && order.deliveryAddress && <small>Pedido anterior: la ruta usa la dirección escrita. Confírmala con el cliente.</small>}
        <details><summary>{order.items.reduce((sum, item) => sum + item.quantity, 0)} productos · Ver pedido</summary><ul>{order.items.map((item) => <li key={item.id}><strong>{item.quantity} × {item.productName}</strong>{item.customization.length > 0 && <small>{item.customization.join(" · ")}</small>}</li>)}</ul></details>
        {order.notes && <p>Nota: {order.notes}</p>}
        <p className="delivery-ticket__total"><span>{order.paymentStatus === "PAID" ? `Pagado · ${order.paymentMethod ? paymentMethodLabels[order.paymentMethod] : ""}` : order.paymentStatus === "REFUNDED" ? "Reembolsado" : order.paymentStatus === "PARTIALLY_REFUNDED" ? "Reembolso parcial" : "Pendiente de cobro"}</span><strong>{formatPrice(order.totalCents)}</strong></p>
        {manager && order.deliveryStatus !== "DELIVERED" ? <label className="delivery-ticket__assignment">Repartidor asignado<select aria-label={`Repartidor del pedido ${order.orderNumber}`} value={order.assignedDriver?.id ?? ""} disabled={pending !== null} onChange={(event) => { if (event.target.value) void act(order, "ASSIGN", event.target.value); }}><option value="" disabled>Selecciona un repartidor</option>{feed.drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select>{order.deliveryStatus === "OUT_FOR_DELIVERY" && <small>Reasigna solo si el nuevo repartidor se hace cargo. El cambio queda registrado.</small>}</label> : <p>Repartidor: <strong>{order.assignedDriver?.name ?? "Sin asignar"}</strong></p>}
        <footer>
          <a className="delivery-ticket__receipt" href={`/admin/pedidos/${order.id}/comprobante`} target="_blank" rel="noopener noreferrer"><Printer aria-hidden="true" />Ver / imprimir comprobante</a>
          {view === "active" && order.assignedDriver && order.status === "READY" && order.deliveryStatus === "PENDING" && <button type="button" className="button button--solid" disabled={pending !== null} onClick={() => void act(order, "DISPATCH")}><Truck aria-hidden="true" />Salir a reparto</button>}
          {view === "active" && order.status === "READY" && order.deliveryStatus === "OUT_FOR_DELIVERY" && <button type="button" className="button button--solid" disabled={pending !== null} onClick={() => void act(order, "DELIVER")}><Check aria-hidden="true" />Confirmar entrega</button>}
          {!manager && !!feed.allowedPaymentMethods?.length && order.status === "SERVED" && order.deliveryStatus === "DELIVERED" && <div className="delivery-ticket__payment">{paymentId === order.id ? <><label>Método recibido<select value={paymentMethod} onChange={(event) => { setPaymentMethod(event.target.value as PaymentMethod); setVerified(false); }}>{feed.allowedPaymentMethods.map((method) => <option key={method} value={method}>{paymentMethodLabels[method]}</option>)}</select></label><p>{paymentMethod === "CASH" ? "Requiere una caja abierta." : paymentMethod === "CARD" ? "Verifica la aprobación en el terminal del local. Este botón no carga la tarjeta." : "Confirma el abono en la cuenta del local; no aceptes solo una captura."}</p><label className="delivery-payment-verified"><input type="checkbox" checked={verified} onChange={(event) => setVerified(event.target.checked)} />Confirmo que recibí o verifiqué {formatPrice(order.totalCents)}.</label><button className="button button--solid" disabled={pending !== null || !verified || !feed.allowedPaymentMethods.includes(paymentMethod)} onClick={() => void act(order, "PAYMENT")}>Confirmar cobro · {formatPrice(order.totalCents)}</button><button className="button button--line" disabled={pending !== null} onClick={() => setPaymentId(null)}>Cancelar</button></> : <button className="button button--solid" disabled={pending !== null} onClick={() => { setPaymentId(order.id); setPaymentMethod(feed.allowedPaymentMethods[0]); setVerified(false); }}>Registrar cobro</button>}</div>}
          {cooking && <small>Espera a que cocina marque el pedido listo.</small>}
          {order.status === "SERVED" && order.deliveryStatus === "DELIVERED" && (manager || !feed.allowedPaymentMethods?.length) && <small>Caja puede registrar el pago en Cocina → Entregados.</small>}
        </footer>
      </article>;
    })}</div>
    {view === "history" && loaded && <nav className="delivery-pagination" aria-label="Páginas de entregas"><button type="button" className="button button--line" disabled={page <= 1 || pending !== null} onClick={() => { setPage(page - 1); setLoaded(false); setPaymentId(null); }}>Anterior</button><span>Página {page} de {Math.max(1, Math.ceil(feed.total / 20))}</span><button type="button" className="button button--line" disabled={page * 20 >= feed.total || pending !== null} onClick={() => { setPage(page + 1); setLoaded(false); setPaymentId(null); }}>Siguiente</button></nav>}
  </section>;
}
