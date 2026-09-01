"use client";

import { Calculator, LockKeyhole, UnlockKeyhole } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { CashShiftView } from "@/lib/domain";
import { formatPrice } from "@/lib/format";
import { requestJson } from "./admin-api";

function cents(value: string) { return Math.round(Number(value || 0) * 100); }

export function CashRegister() {
  const [shifts, setShifts] = useState<CashShiftView[]>([]);
  const [opening, setOpening] = useState("0.00");
  const [actual, setActual] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const openShift = shifts.find((shift) => shift.status === "OPEN");
  const load = useCallback(async () => { try { const result = await requestJson<{ shifts: CashShiftView[] }>("/api/admin/cash-shifts"); setShifts(result.shifts); } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos cargar la caja."); } }, []);
  useEffect(() => { const initial = window.setTimeout(load, 0); const interval = window.setInterval(load, 10000); return () => { window.clearTimeout(initial); window.clearInterval(interval); }; }, [load]);
  useEffect(() => { if (!message) return; const timeout = window.setTimeout(() => setMessage(""), 5000); return () => window.clearTimeout(timeout); }, [message]);

  async function openRegister(event: React.FormEvent) {
    event.preventDefault(); setPending(true);
    try { await requestJson("/api/admin/cash-shifts", "POST", { openingBalanceCents: cents(opening), notes }); setMessage("Caja abierta correctamente."); setNotes(""); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos abrir la caja."); } finally { setPending(false); }
  }
  async function closeRegister(event: React.FormEvent) {
    event.preventDefault(); if (!openShift || !window.confirm("¿Confirmas el cierre de caja? El resultado quedará auditado.")) return; setPending(true);
    try { await requestJson(`/api/admin/cash-shifts/${openShift.id}`, "PATCH", { actualCashCents: cents(actual), notes }); setMessage("Caja cerrada y conciliada."); setActual(""); setNotes(""); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos cerrar la caja."); } finally { setPending(false); }
  }

  return <div className="cash-register">
    <section className="cash-register__current"><header><div><p className="eyebrow">Turno de caja</p><h2>{openShift ? "Caja abierta" : "Caja cerrada"}</h2></div>{openShift ? <UnlockKeyhole /> : <LockKeyhole />}</header>{message && <p className="admin-inline-message">{message}</p>}
      {openShift ? <><div className="cash-register__totals"><div><span>Fondo inicial</span><strong>{formatPrice(openShift.openingBalanceCents)}</strong></div><div><span>Efectivo cobrado</span><strong>{formatPrice(openShift.cashSalesCents)}</strong></div><div><span>Efectivo esperado</span><strong>{formatPrice(openShift.expectedCashCents)}</strong></div></div><form onSubmit={closeRegister}><label>Efectivo contado al cierre<input type="number" min="0" step="0.01" inputMode="decimal" value={actual} onChange={(event) => setActual(event.target.value)} required /></label><label>Nota de cierre<textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} /></label><button className="button button--solid" disabled={pending}><Calculator />Cerrar y conciliar</button></form></> : <form onSubmit={openRegister}><label>Fondo inicial<input type="number" min="0" step="0.01" inputMode="decimal" value={opening} onChange={(event) => setOpening(event.target.value)} required /></label><label>Nota de apertura<textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} /></label><button className="button button--solid" disabled={pending}><UnlockKeyhole />Abrir caja</button></form>}
    </section>
    <section className="cash-history"><header><p className="eyebrow">Últimos 30 turnos</p><h2>Historial de cierres</h2></header><div className="cash-history__table">{shifts.filter((shift) => shift.status === "CLOSED").map((shift) => <article key={shift.id}><span><strong>{shift.businessDate}</strong><small>{shift.closedByName}</small></span><span>Esperado<strong>{formatPrice(shift.expectedCashCents)}</strong></span><span>Contado<strong>{formatPrice(shift.actualCashCents ?? 0)}</strong></span><span data-negative={(shift.discrepancyCents ?? 0) < 0}>Diferencia<strong>{formatPrice(shift.discrepancyCents ?? 0)}</strong></span></article>)}{!shifts.some((shift) => shift.status === "CLOSED") && <p>Aún no hay cierres registrados.</p>}</div></section>
  </div>;
}
