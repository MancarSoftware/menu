"use client";

import { ChevronLeft, ChevronRight, ReceiptText, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CashCollectionsView, PaymentMethod } from "@/lib/domain";
import { formatPrice } from "@/lib/format";
import { paymentMethodLabels } from "@/lib/payment-labels";
import { requestJson } from "./admin-api";
import { useBusinessToday } from "./use-business-today";
import { useLiveRefresh } from "./use-live-refresh";

const timestamp = (value: string) => new Intl.DateTimeFormat("es-EC", {
  timeZone: "America/Guayaquil", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
}).format(new Date(value));
const methodLabel = (method: string) => paymentMethodLabels[method as PaymentMethod] ?? method;
const channelLabel: Record<string, string> = { DINE_IN: "En mesa", DELIVERY: "Delivery", PICKUP: "Retiro" };

export function CashCollections() {
  const today = useBusinessToday();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const date = selectedDate ?? today;
  const [pagination, setPagination] = useState({ date, page: 1 });
  const page = pagination.date === date ? pagination.page : 1;
  const key = `${date}/${page}`;
  const [result, setResult] = useState<{ key: string; data: CashCollectionsView } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const latestRequest = useRef(0);
  const data = result?.key === key ? result.data : null;
  const error = failure?.key === key ? failure.message : null;

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    setRefreshing(true);
    try {
      const response = await requestJson<{ collections: CashCollectionsView }>(`/api/admin/cash-collections?date=${date}&page=${page}`);
      if (request !== latestRequest.current) return;
      setResult({ key, data: response.collections });
      setFailure(null);
    } catch (error) {
      if (request === latestRequest.current) setFailure({ key, message: error instanceof Error ? error.message : "No pudimos cargar los cobros." });
    } finally {
      if (request === latestRequest.current) setRefreshing(false);
    }
  }, [date, key, page]);
  useLiveRefresh(load);
  useEffect(() => () => { latestRequest.current += 1; }, [load]);

  function changeDate(value: string | null) {
    setSelectedDate(value);
    setPagination({ date: value ?? today, page: 1 });
  }

  return <section className="cash-collections" aria-labelledby="cash-collections-title">
    <header className="cash-collections__header">
      <div><p className="eyebrow">Local + repartos · todos los canales</p><h2 id="cash-collections-title">Cobros del día</h2><p>Por fecha de pago · Ecuador · Actualización cada 5 s</p></div>
      <div className="cash-collections__controls">
        <label>Fecha de cobro<input type="date" value={date} onChange={(event) => { if (event.target.value) changeDate(event.target.value); }} /></label>
        <button type="button" className="button button--line" aria-pressed={selectedDate === null} onClick={() => changeDate(null)}>Hoy</button>
        <button type="button" className="button button--line" disabled={refreshing} onClick={() => void load()}><RefreshCw size={16} />Actualizar cobros</button>
      </div>
    </header>
    {error && <p className="admin-inline-message" role="alert">{error} {data ? "Los importes visibles pueden estar desactualizados." : "No se han podido consultar los importes."} Usa «Actualizar cobros» para reintentar.</p>}
    {!data && !error && <p className="cash-collections__empty" role="status">Cargando cobros…</p>}
    {data && <>
      <div className="cash-collections__summary">
        <div className="cash-collections__total"><span>Total cobrado</span><strong>{formatPrice(data.totals.collectedCents)}</strong><small>{data.totals.paymentCount} {data.totals.paymentCount === 1 ? "cobro registrado" : "cobros registrados"}</small></div>
        {data.methods.map((method) => <div key={method.method}><span>{methodLabel(method.method)}</span><strong>{formatPrice(method.collectedCents)}</strong><small>Reembolsos: {formatPrice(method.refundsCents)}</small></div>)}
      </div>
      <div className="cash-collections__net"><span>Reembolsos totales <strong>{formatPrice(data.totals.refundsCents)}</strong></span><span>Neto del día <strong>{formatPrice(data.totals.netCents)}</strong></span></div>
      <p className="cash-collections__note">Incluye cobros de caja y repartidores, incluso pagos sin turno. Tarjeta y transferencia cuentan como ingresos, no como efectivo. El cierre se calcula por turno, no por esta fecha.</p>
      <h3>Detalle de cobros y reembolsos</h3>
      {data.events.length ? <table className="cash-ledger">
        <caption className="sr-only">Movimientos del {date}. Los totales incluyen todas las páginas.</caption>
        <thead><tr><th scope="col">Pedido</th><th scope="col">Movimiento</th><th scope="col">Importe</th><th scope="col">Registrado por</th><th scope="col">Turno</th><th scope="col">Fecha y hora</th></tr></thead>
        <tbody>{data.events.map((event) => <tr key={event.id}>
          <td data-label="Pedido"><a className="cash-ledger__receipt" href={`/admin/pedidos/${event.order.id}/comprobante`} target="_blank" rel="noopener noreferrer" aria-label={`Ver comprobante del pedido ${event.order.orderNumber} del ${event.order.businessDate} (nueva pestaña)`}>#{event.order.orderNumber}<ReceiptText size={16} /></a><small>{event.order.businessDate} · {channelLabel[event.order.mode] ?? event.order.mode}</small></td>
          <td data-label="Movimiento"><strong>{event.type === "REFUND" ? "Reembolso" : "Cobro"}</strong><small>{methodLabel(event.method)}</small></td>
          <td data-label="Importe" className="cash-ledger__amount" data-refund={event.type === "REFUND"}>{event.type === "REFUND" ? "−" : ""}{formatPrice(event.amountCents)}</td>
          <td data-label="Registrado por">{event.actorName}</td>
          <td data-label="Turno">{event.shift ? <><span>{event.shift.status === "OPEN" ? "Abierto" : "Cerrado"} · {event.shift.businessDate}</span><small>Apertura: {timestamp(event.shift.openedAt)}</small><small className="cash-ledger__shift-id">ID: {event.shift.id}</small></> : <span className="cash-ledger__unassigned">Sin turno de caja</span>}</td>
          <td data-label="Fecha y hora"><time dateTime={event.createdAt}>{timestamp(event.createdAt)}</time></td>
        </tr>)}</tbody>
      </table> : <p className="cash-collections__empty">No hay cobros ni reembolsos registrados en esta fecha. Un pedido pendiente de pago no se suma todavía.</p>}
      <footer className="cash-collections__pagination">
        <p>{data.totalEvents} movimientos · Página {data.page} de {data.totalPages}<small>Los totales incluyen todas las páginas.</small></p>
        <div><button type="button" className="button button--line" aria-label="Página anterior de cobros" disabled={data.page <= 1 || refreshing} onClick={() => setPagination({ date, page: data.page - 1 })}><ChevronLeft size={16} />Anterior</button><button type="button" className="button button--line" aria-label="Página siguiente de cobros" disabled={data.page >= data.totalPages || refreshing} onClick={() => setPagination({ date, page: data.page + 1 })}>Siguiente<ChevronRight size={16} /></button></div>
      </footer>
    </>}
  </section>;
}
