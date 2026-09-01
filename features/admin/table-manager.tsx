"use client";

import { Armchair, Check, Plus, QrCode, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { DiningTableStatus, DiningTableView } from "@/lib/domain";
import { requestJson } from "./admin-api";

const statusLabels: Record<DiningTableStatus, string> = { AVAILABLE: "Disponible", OCCUPIED: "Ocupada", CLEANING: "Por limpiar", INACTIVE: "Inactiva" };

export function TableManager({ initialTables }: { initialTables: DiningTableView[] }) {
  const [tables, setTables] = useState(initialTables);
  const [form, setForm] = useState({ number: String((initialTables.at(-1)?.number ?? 0) + 1), name: `Mesa ${(initialTables.at(-1)?.number ?? 0) + 1}`, capacity: "4" });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { const timeout = window.setTimeout(() => setTables(initialTables), 0); return () => window.clearTimeout(timeout); }, [initialTables]);
  useEffect(() => {
    let stopped = false;
    async function refreshTables() {
      try {
        const result = await requestJson<{ tables: DiningTableView[] }>("/api/tables");
        if (!stopped) setTables(result.tables);
      } catch (error) {
        if (!stopped) setMessage(error instanceof Error ? error.message : "No pudimos actualizar las mesas.");
      }
    }
    void refreshTables();
    const interval = window.setInterval(refreshTables, 5000);
    return () => { stopped = true; window.clearInterval(interval); };
  }, []);
  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  async function createTable(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setMessage("");
    try {
      const result = await requestJson<{ table: DiningTableView }>("/api/tables", "POST", { number: Number(form.number), name: form.name, capacity: Number(form.capacity), isActive: true });
      setTables((current) => [...current, result.table].sort((a, b) => a.number - b.number));
      const nextNumber = Number(form.number) + 1;
      setForm({ number: String(nextNumber), name: `Mesa ${nextNumber}`, capacity: "4" });
      setMessage("Mesa creada. El QR ya está disponible.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos crear la mesa."); }
    finally { setPending(false); }
  }

  async function updateTable(table: DiningTableView, input: Partial<DiningTableView>) {
    setMessage("");
    try {
      const result = await requestJson<{ table: DiningTableView }>(`/api/tables/${table.id}`, "PATCH", input);
      setTables((current) => current.map((candidate) => candidate.id === table.id ? result.table : candidate));
    } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos actualizar la mesa."); }
  }

  return <div className="table-admin">
    <section className="admin-list">
      <header><div><p className="eyebrow">Salón</p><h2>{tables.filter((table) => table.isActive).length} mesas activas</h2></div></header>
      <div className="table-grid">{tables.map((table) => <article className="table-card" key={table.id} data-status={table.status}>
        <header><span><Armchair aria-hidden="true" /></span><div><strong>Mesa {table.number}</strong><small>{table.name}</small></div><b>{statusLabels[table.status]}</b></header>
        <p><Users aria-hidden="true" /> Capacidad para {table.capacity}</p>
        <div className="table-card__actions">
          <a className="button button--line" href={`/api/tables/${table.id}/qr`} target="_blank" rel="noreferrer"><QrCode aria-hidden="true" /> Ver QR</a>
          {table.status === "CLEANING" && <button className="button button--solid" type="button" onClick={() => updateTable(table, { status: "AVAILABLE" })}><Check aria-hidden="true" /> Ya está lista</button>}
          <button className="table-toggle" type="button" onClick={() => updateTable(table, { isActive: !table.isActive })}>{table.isActive ? "Desactivar" : "Activar"}</button>
        </div>
      </article>)}</div>
    </section>

    <form className="admin-editor" onSubmit={createTable}>
      <header><p className="eyebrow">Nueva mesa</p><h2>Agregar al salón</h2></header>
      <div className="form-field"><label htmlFor="table-number">Número</label><input id="table-number" type="number" min="1" max="999" inputMode="numeric" value={form.number} onChange={(event) => setForm({ ...form, number: event.target.value.replace(/\D/g, "") })} required /></div>
      <div className="form-field"><label htmlFor="table-name">Nombre visible</label><input id="table-name" minLength={2} maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></div>
      <div className="form-field"><label htmlFor="table-capacity">Capacidad</label><input id="table-capacity" type="number" min="1" max="30" inputMode="numeric" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value.replace(/\D/g, "") })} required /></div>
      {message && <p className="admin-inline-message" role="status">{message}</p>}
      <button className="button button--solid" type="submit" disabled={pending}><Plus aria-hidden="true" />{pending ? "Creando…" : "Crear mesa"}</button>
    </form>
  </div>;
}
