"use client";

import { Download, FileText, Printer, Search, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { OrderView, RevenueReportView } from "@/lib/domain";
import { getBusinessDate } from "@/lib/business-date";
import { formatPrice } from "@/lib/format";
import { requestJson } from "./admin-api";
import { ReceiptDocument, type ReceiptView } from "@/features/orders/receipt-document";
import { useBusinessToday } from "./use-business-today";
import { useLiveRefresh } from "./use-live-refresh";

function daysAgo(days: number) { const date = new Date(`${getBusinessDate()}T12:00:00-05:00`); date.setDate(date.getDate() - days); return date.toISOString().slice(0, 10); }
function weekStart() { const date = new Date(`${getBusinessDate()}T12:00:00-05:00`); const day = date.getDay() || 7; date.setDate(date.getDate() - day + 1); return date.toISOString().slice(0, 10); }
function monthStart() { return `${getBusinessDate().slice(0, 8)}01`; }

export function ReportsPanel() {
  const today = useBusinessToday();
  const [storedFilters, setStoredFilters] = useState({ from: today, to: today, status: "", paymentMethod: "", mode: "", table: "" });
  const [followToday, setFollowToday] = useState(true);
  const filters = useMemo(() => followToday ? { ...storedFilters, from: today, to: today } : storedFilters, [followToday, storedFilters, today]);
  function setFilters(value: typeof storedFilters) { setFollowToday(false); setStoredFilters(value); }
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [report, setReport] = useState<RevenueReportView | null>(null);
  const [receipt, setReceipt] = useState<ReceiptView | null>(null);
  const [message, setMessage] = useState("");
  const latestRequest = useRef(0);
  const query = useMemo(() => new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString(), [filters]);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const [orderResult, revenueResult] = await Promise.all([
        requestJson<{ orders: OrderView[] }>(`/api/admin/reports/orders?${query}`),
        requestJson<{ report: RevenueReportView }>(`/api/admin/reports/revenue?from=${filters.from}&to=${filters.to}`),
      ]);
      if (request !== latestRequest.current) return;
      setOrders(orderResult.orders); setReport(revenueResult.report); setMessage("");
    } catch (error) { if (request === latestRequest.current) setMessage(error instanceof Error ? error.message : "No pudimos cargar los reportes."); }
  }, [filters.from, filters.to, query]);
  useLiveRefresh(load);

  async function openReceipt(order: OrderView) {
    try { setReceipt(await requestJson<ReceiptView>(`/api/admin/orders/${order.id}/receipt`)); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos abrir el comprobante."); }
  }
  async function refundPayment() {
    if (!receipt) return;
    const amount = window.prompt("Valor a reembolsar en USD:");
    const reason = amount ? window.prompt("Motivo del reembolso (obligatorio):") : null;
    if (!amount || !reason) return;
    try { await requestJson(`/api/admin/orders/${receipt.order.id}/refund`, "POST", { action: "REFUND", amountCents: Math.round(Number(amount) * 100), reason }); await openReceipt(receipt.order); await load(); setMessage("Reembolso registrado en la auditoría."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos registrar el reembolso."); }
  }
  async function changePaymentMethod() {
    if (!receipt) return;
    const paymentMethod = window.prompt("Nuevo método: CASH, CARD o TRANSFER")?.toUpperCase();
    const reason = paymentMethod ? window.prompt("Motivo de la corrección (obligatorio):") : null;
    if (!paymentMethod || !reason || !["CASH", "CARD", "TRANSFER"].includes(paymentMethod)) return;
    try { await requestJson(`/api/admin/orders/${receipt.order.id}/refund`, "POST", { action: "CHANGE_METHOD", paymentMethod, reason }); await openReceipt(receipt.order); await load(); setMessage("Método de pago corregido."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos corregir el pago."); }
  }
  function preset(from: string) { setStoredFilters((current) => ({ ...current, from, to: today })); setFollowToday(from === today); }

  return <div className="reports-panel">
    <section className="report-summary"><header><div><p className="eyebrow">Ventas verificadas</p><h2>Ingresos y pedidos</h2><p className="report-date-help">Cobros de todos los canales por fecha de pago · Ecuador · Actualización cada 5 s</p></div><div className="report-presets"><button onClick={() => preset(today)}>Hoy</button><button onClick={() => preset(weekStart())}>Esta semana</button><button onClick={() => preset(monthStart())}>Este mes</button><button onClick={() => preset(daysAgo(29))}>Últimos 30 días</button></div></header><div className="report-kpis"><div><span>Ingresos</span><strong>{formatPrice(report?.revenueCents ?? 0)}</strong></div><div><span>Reembolsos</span><strong>{formatPrice(report?.refundsCents ?? 0)}</strong></div><div><span>Ingreso neto</span><strong>{formatPrice(report?.netRevenueCents ?? 0)}</strong></div><div><span>Cobros</span><strong>{report?.paymentCount ?? 0}</strong></div></div>{report && report.points.length > 0 && <div className="revenue-bars" aria-label="Ingresos por día">{report.points.map((point) => { const max = Math.max(...report.points.map((item) => item.revenueCents), 1); return <div key={point.label}><span style={{ height: `${Math.max(6, point.revenueCents / max * 100)}%` }} title={`${point.label}: ${formatPrice(point.revenueCents)}`} /><small>{point.label.slice(5)}</small></div>; })}</div>}</section>

    <section className="order-history"><header><div><p className="eyebrow">Hasta 500 resultados</p><h2>Historial de pedidos</h2></div><div className="report-actions"><a className="button button--line" href={`/api/admin/reports/orders?${query}&format=csv`}><Download />CSV</a><a className="button button--line" href={`/admin/reportes/imprimir?from=${filters.from}&to=${filters.to}`} target="_blank"><Printer />PDF / imprimir</a></div></header>
      <div className="report-filters"><label>Desde<input type="date" value={filters.from} max={filters.to} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label><label>Hasta<input type="date" value={filters.to} min={filters.from} max={today} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label><label>Canal<select value={filters.mode} onChange={(event) => setFilters({ ...filters, mode: event.target.value })}><option value="">Todos</option><option value="DINE_IN">Mesa</option><option value="DELIVERY">Delivery</option><option value="PICKUP">Retiro</option></select></label><label>Estado<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Todos</option>{["RECEIVED", "PREPARING", "READY", "SERVED", "PAID", "CANCELLED"].map((value) => <option key={value}>{value}</option>)}</select></label><label>Pago<select value={filters.paymentMethod} onChange={(event) => setFilters({ ...filters, paymentMethod: event.target.value })}><option value="">Todos</option><option value="CASH">Efectivo</option><option value="CARD">Tarjeta</option><option value="TRANSFER">Transferencia</option></select></label><label>Mesa<input type="number" min="1" value={filters.table} onChange={(event) => setFilters({ ...filters, table: event.target.value })} /></label></div>
      {message && <p className="admin-inline-message">{message}</p>}
      <div className="order-history__table"><div className="order-history__head"><span>Pedido</span><span>Canal</span><span>Estado</span><span>Pago</span><span>Total</span><span /></div>{orders.map((order) => <button className="order-history__row" key={order.id} onClick={() => openReceipt(order)}><span><strong>#{order.orderNumber}</strong><small>{order.businessDate}</small></span><span>{order.mode === "DINE_IN" ? `Mesa ${order.table?.number}` : order.mode === "DELIVERY" ? "Delivery" : "Retiro"}</span><span>{order.status}</span><span>{order.paymentMethod ?? "Pendiente"}</span><strong>{formatPrice(order.totalCents)}</strong><FileText /></button>)}{!orders.length && <p className="report-empty"><Search />No hay pedidos con esos filtros.</p>}</div>
    </section>

    {receipt && <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Comprobante de pedido"><article className="admin-modal__panel receipt-modal"><button className="admin-modal__close" onClick={() => setReceipt(null)} aria-label="Cerrar"><X /></button><ReceiptDocument receipt={receipt} /><div className="report-actions">{receipt.paymentEvents.some((event) => event.type === "PAYMENT") && <><button className="button button--line" onClick={refundPayment}>Reembolsar</button><button className="button button--line" onClick={changePaymentMethod}>Corregir método</button></>}<a className="button button--solid" href={`/admin/pedidos/${receipt.order.id}/comprobante`} target="_blank" rel="noopener noreferrer"><Printer />Imprimir comprobante</a></div></article></div>}
  </div>;
}
