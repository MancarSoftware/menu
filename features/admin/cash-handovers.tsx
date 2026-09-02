"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";
import { requestJson } from "./admin-api";
import { useLiveRefresh } from "./use-live-refresh";

type HandoverItem = { id: string; driverName: string; amountCents: number; orderNumber: number; orderDate: string; createdAt: string; canReceive?: boolean; receivedByName?: string };
type HandoverFeed = { pending: HandoverItem[]; history: HandoverItem[]; pendingCount: number; totalPendingCents: number };

export function CashHandovers({ manager, onReceived }: { manager: boolean; onReceived?: () => Promise<void> }) {
  const [feed, setFeed] = useState<HandoverFeed | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const latest = useRef(0);
  const busy = useRef(false);
  const load = useCallback(async () => {
    const request = ++latest.current;
    try { const result = await requestJson<HandoverFeed>("/api/admin/cash-handovers"); if (request === latest.current) { setFeed(result); setError(""); } }
    catch (error) { if (request === latest.current) setError(error instanceof Error ? error.message : "No pudimos consultar las entregas de efectivo."); }
  }, []);
  useLiveRefresh(load);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 5000); return () => window.clearTimeout(timer); }, [notice]);
  async function receive(item: HandoverItem) {
    if (busy.current || !window.confirm(`¿Recibiste físicamente ${formatPrice(item.amountCents)} de ${item.driverName} por el pedido #${item.orderNumber}? Esta confirmación queda registrada.`)) return;
    busy.current = true; setPending(item.id); setNotice("");
    try {
      await requestJson("/api/admin/cash-handovers", "POST", { paymentEventId: item.id, confirmedReceived: true });
      setNotice("Efectivo recibido en caja. No se agregó otra venta.");
      await load(); await onReceived?.();
    } catch (error) { setError(error instanceof Error ? error.message : "No pudimos confirmar la recepción. Actualiza antes de reintentar."); }
    finally { busy.current = false; setPending(null); }
  }
  return <section className="cash-handovers" aria-labelledby="handover-title">
    <header><div><p className="eyebrow">Control de efectivo</p><h2 id="handover-title">{manager ? "Efectivo de repartidores" : "Mi efectivo por entregar"}</h2></div><button type="button" className="button button--line" onClick={() => void load()}>Actualizar entregas</button></header>
    <p>El cobro ya está incluido en ventas. {manager ? "Confirma solo el dinero que recibiste físicamente. Las entregas se registran por el importe completo de cada cobro." : "Entrega el dinero al cajero; solo caja puede confirmar que lo recibió."}</p>
    {error && <p className="admin-inline-message" role="alert">{error} Los datos pueden estar desactualizados.</p>}
    {notice && <p role="status">{notice}</p>}
    {!feed && !error && <p role="status">Consultando efectivo…</p>}
    {feed && <><p className="cash-handovers__balance"><span>Pendiente de entrega · {feed.pendingCount} {feed.pendingCount === 1 ? "cobro" : "cobros"}</span><strong>{formatPrice(feed.totalPendingCents)}</strong></p>
      {!feed.pending.length && <p>No hay entregas de efectivo pendientes.</p>}
      <div className="cash-handovers__list">{feed.pending.map((item) => <article key={item.id}><div><strong>{item.driverName}</strong><small>Pedido #{item.orderNumber} · {item.orderDate}</small></div><strong>{formatPrice(item.amountCents)}</strong>{manager && <button type="button" className="button button--solid" disabled={pending !== null || Boolean(error) || !item.canReceive} onClick={() => void receive(item)}>{pending === item.id ? "Confirmando…" : "Confirmar recepción"}</button>}{!item.canReceive && <small>Turno cerrado o no disponible. Requiere revisión administrativa.</small>}</article>)}</div>
      {feed.pendingCount > feed.pending.length && <p>Se muestran los primeros 100 cobros pendientes; al recibirlos aparecerán los siguientes.</p>}
      <details><summary>Últimas 30 entregas confirmadas</summary><div className="cash-handovers__list">{feed.history.map((item) => <article key={item.id}><div><strong>{item.driverName} → {item.receivedByName}</strong><small>Pedido #{item.orderNumber} · {item.orderDate}</small><small>{new Date(item.createdAt).toLocaleString("es-EC", { timeZone: "America/Guayaquil" })}</small></div><strong>{formatPrice(item.amountCents)}</strong></article>)}{!feed.history.length && <p>Todavía no hay recepciones confirmadas.</p>}</div></details>
    </>}
    <small>Los cobros anteriores a este control no se marcan automáticamente como entregados. Deben revisarse al iniciar el piloto.</small>
  </section>;
}
