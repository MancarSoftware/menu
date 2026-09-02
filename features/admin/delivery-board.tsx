"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, MapPinned, Phone, RefreshCw, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import type { DeliveryOrderView } from "@/lib/domain";
import { deliveryDirectionsUrl, deliveryStatusLabel } from "@/lib/delivery";
import { formatPrice } from "@/lib/format";
import { requestJson, SessionExpiredError } from "./admin-api";

type DeliveryFeed = { orders: DeliveryOrderView[]; drivers: { id: string; name: string }[]; canCollectCash: boolean };

export function DeliveryBoard({ manager }: { manager: boolean }) {
  const router = useRouter();
  const [feed, setFeed] = useState<DeliveryFeed>({ orders: [], drivers: [], canCollectCash: false });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<number | null>(null);
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const latestRequest = useRef(0);

  const refresh = useCallback(async () => {
    const current = generation.current;
    const request = ++latestRequest.current;
    try {
      const result = await requestJson<DeliveryFeed>("/api/admin/deliveries");
      if (current !== generation.current || request !== latestRequest.current) return;
      setFeed(result); setLoaded(true); setError("");
    } catch (reason) {
      if (current !== generation.current || request !== latestRequest.current) return;
      if (reason instanceof SessionExpiredError) router.replace("/admin/login");
      setError(reason instanceof Error ? reason.message : "No pudimos actualizar los repartos.");
    }
  }, [router]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void refresh(); });
    const interval = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); };
  }, [refresh]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 5000); return () => window.clearTimeout(timer); }, [notice]);

  async function act(order: DeliveryOrderView, action: "ASSIGN" | "DISPATCH" | "DELIVER" | "CASH", driverId?: string) {
    if (busy.current) return;
    busy.current = true; generation.current++; setPending(order.id); setNotice("");
    let failure = "";
    try {
      if (action === "CASH") await requestJson(`/api/admin/orders/${order.id}`, "PATCH", { version: order.version, status: "PAID", paymentMethod: "CASH" });
      else await requestJson(`/api/admin/deliveries/${order.id}`, "PATCH", { action, version: order.version, ...(driverId ? { driverId } : {}) });
      setPaymentId(null);
      setNotice(action === "CASH" ? "Cobro en efectivo registrado." : "Reparto actualizado.");
    } catch (reason) { failure = reason instanceof Error ? reason.message : "No pudimos actualizar este reparto."; }
    finally {
      generation.current++;
      await refresh();
      if (failure) setNotice(failure);
      setPending(null); busy.current = false;
    }
  }

  return <section className="delivery-board">
    <header className="delivery-board__header"><div><p className="eyebrow">{manager ? "Despacho y seguimiento" : "Tu ruta de trabajo"}</p><h2>{manager ? "Repartos del local" : "Mis entregas"}</h2><p>Los pedidos se guardan y actualizan cada 5 segundos.</p></div><button type="button" className="button button--line" onClick={() => void refresh()}><RefreshCw aria-hidden="true" />Actualizar</button></header>
    {error && <p className="admin-inline-message" role="alert">{error} <a href="/admin/login">Revisar acceso</a></p>}
    {notice && <p className="admin-inline-message" role="status">{notice}</p>}
    {!loaded && !error && <p role="status">Cargando repartos…</p>}
    {manager && loaded && !feed.drivers.length && <p className="admin-inline-message">Crea un usuario con el rol «Repartidor» en Equipo para asignar pedidos.</p>}
    {loaded && !feed.orders.length && <p className="delivery-board__empty">{manager ? "No hay repartos pendientes." : "No tienes entregas asignadas. Aparecerán aquí cuando caja te asigne un pedido."}</p>}
    <div className="delivery-board__list">{feed.orders.map((order) => {
      const directions = deliveryDirectionsUrl(order);
      const cooking = ["RECEIVED", "PREPARING"].includes(order.status);
      return <article className="delivery-ticket" key={order.id}>
        <header><div><p className="eyebrow">{new Date(order.createdAt).toLocaleDateString("es-EC")}</p><h3>Pedido #{order.orderNumber}</h3></div><span className="delivery-ticket__status" data-status={order.deliveryStatus}>{cooking ? "En cocina" : deliveryStatusLabel(order.deliveryStatus)}</span></header>
        <p><strong>{order.customerName ?? "Cliente"}</strong>{order.customerPhone && <a className="delivery-ticket__phone" href={`tel:${order.customerPhone.replace(/[^+0-9]/g, "")}`}><Phone aria-hidden="true" />{order.customerPhone}</a>}</p>
        <p>{order.deliveryAddress || "Entrega en el punto confirmado del mapa."}</p>
        {directions ? <a className="button button--line" href={directions} target="_blank" rel="noopener noreferrer"><MapPinned aria-hidden="true" />Abrir ruta en Google Maps</a> : <p className="admin-inline-message">Pedido anterior sin ubicación. Contacta al cliente antes de salir.</p>}
        {order.deliveryLatitude == null && order.deliveryAddress && <small>Pedido anterior: la ruta usa la dirección escrita. Confírmala con el cliente.</small>}
        <details><summary>{order.items.reduce((sum, item) => sum + item.quantity, 0)} productos · Ver pedido</summary><ul>{order.items.map((item) => <li key={item.id}><strong>{item.quantity} × {item.productName}</strong>{item.customization.length > 0 && <small>{item.customization.join(" · ")}</small>}</li>)}</ul></details>
        {order.notes && <p>Nota: {order.notes}</p>}
        <p className="delivery-ticket__total"><span>{order.paymentStatus === "PAID" ? "Pagado" : "Pendiente de cobro"}</span><strong>{formatPrice(order.totalCents)}</strong></p>
        {manager && order.deliveryStatus !== "DELIVERED" ? <label className="delivery-ticket__assignment">Repartidor asignado<select aria-label={`Repartidor del pedido ${order.orderNumber}`} value={order.assignedDriver?.id ?? ""} disabled={pending !== null} onChange={(event) => { if (event.target.value) void act(order, "ASSIGN", event.target.value); }}><option value="" disabled>Selecciona un repartidor</option>{feed.drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select>{order.deliveryStatus === "OUT_FOR_DELIVERY" && <small>Reasigna solo si el nuevo repartidor se hace cargo. El cambio queda registrado.</small>}</label> : <p>Repartidor: <strong>{order.assignedDriver?.name ?? "Sin asignar"}</strong></p>}
        <footer>
          {order.assignedDriver && order.status === "READY" && order.deliveryStatus === "PENDING" && <button type="button" className="button button--solid" disabled={pending !== null} onClick={() => void act(order, "DISPATCH")}><Truck aria-hidden="true" />Salir a reparto</button>}
          {order.status === "READY" && order.deliveryStatus === "OUT_FOR_DELIVERY" && <button type="button" className="button button--solid" disabled={pending !== null} onClick={() => void act(order, "DELIVER")}><Check aria-hidden="true" />Confirmar entrega</button>}
          {!manager && feed.canCollectCash && order.status === "SERVED" && order.deliveryStatus === "DELIVERED" && <div className="delivery-ticket__payment">{paymentId === order.id ? <><p>¿Recibiste {formatPrice(order.totalCents)} en efectivo? Se registrará en la caja abierta.</p><button className="button button--solid" disabled={pending !== null} onClick={() => void act(order, "CASH")}>Sí, confirmar cobro</button><button className="button button--line" disabled={pending !== null} onClick={() => setPaymentId(null)}>Cancelar</button></> : <button className="button button--solid" disabled={pending !== null} onClick={() => setPaymentId(order.id)}>Registrar efectivo recibido</button>}</div>}
          {cooking && <small>Espera a que cocina marque el pedido listo.</small>}
          {order.deliveryStatus === "DELIVERED" && (manager || !feed.canCollectCash) && <small>Caja puede registrar el pago en Cocina → Entregados.</small>}
        </footer>
      </article>;
    })}</div>
  </section>;
}
