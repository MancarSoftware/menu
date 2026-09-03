"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { auditActions, type AuditEntryView, type AuditFeed } from "@/lib/audit-view";
import { requestJson } from "./admin-api";
import type { StaffUserView } from "@/lib/domain";

const dateLabel = (date: string) => new Date(date).toLocaleString("es-EC", { timeZone: "America/Guayaquil", dateStyle: "short", timeStyle: "short" });
export function AuditPanel({ users }: { users: Pick<StaffUserView, "id" | "name">[] }) {
  const [filters, setFilters] = useState({ from: "", to: "", actorId: "", action: "", orderId: "" });
  const [page, setPage] = useState(1);
  const [grouped, setGrouped] = useState(true);
  const [feed, setFeed] = useState<AuditFeed | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const latest = useRef(0);
  const invalidate = useCallback(() => { latest.current++; }, []);
  const query = new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)), page: String(page) }).toString();
  const load = useCallback(async () => {
    const generation = ++latest.current; setLoading(true); setError("");
    try { const result = await requestJson<AuditFeed>(`/api/admin/audit?${query}`); if (generation === latest.current) setFeed(result); }
    catch (reason) { if (generation === latest.current) setError(reason instanceof Error ? reason.message : "No pudimos cargar el historial."); }
    finally { if (generation === latest.current) setLoading(false); }
  }, [query]);
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => { clearTimeout(timer); invalidate(); }; }, [load, users, invalidate]);
  function filter(key: keyof typeof filters, value: string) { latest.current++; setFilters({ ...filters, [key]: value }); setPage(1); setFeed(null); }
  function clearFilters() {
    if (page === 1 && !Object.values(filters).some(Boolean)) { void load(); return; }
    latest.current++; setFilters({ from: "", to: "", actorId: "", action: "", orderId: "" }); setPage(1); setFeed(null);
  }
  const groups = useMemo(() => {
    const result = new Map<string, { title: string; entries: AuditEntryView[] }>();
    for (const entry of feed?.entries ?? []) {
      const key = grouped ? entry.order ? `order-${entry.order.id}` : `other-${entry.subject}` : entry.id;
      const current = result.get(key) ?? { title: entry.subject, entries: [] };
      current.entries.push(entry); result.set(key, current);
    }
    return [...result.entries()];
  }, [feed, grouped]);
  return <section className="audit-list audit-panel" aria-labelledby="audit-title">
    <header><div><p className="eyebrow">Actividad del restaurante</p><h2 id="audit-title">Historial de auditoría</h2><p>Resúmenes claros; los registros originales se conservan.</p></div><button className="button button--line" disabled={loading} onClick={() => void load()}>Actualizar</button></header>
    <div className="audit-panel__filters">
      <label>Desde<input type="date" value={filters.from} onChange={(event) => filter("from", event.target.value)} /></label>
      <label>Hasta<input type="date" value={filters.to} onChange={(event) => filter("to", event.target.value)} /></label>
      <label>Persona<select value={filters.actorId} onChange={(event) => filter("actorId", event.target.value)}><option value="">Todo el equipo</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
      <label>Actividad<select value={filters.action} onChange={(event) => filter("action", event.target.value)}><option value="">Todas las actividades</option>{Object.entries(auditActions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    </div>
    <div className="audit-panel__tools"><label className="check-field"><input type="checkbox" checked={grouped} onChange={(event) => setGrouped(event.target.checked)} />Agrupar esta página por pedido</label><button className="button button--line" onClick={clearFilters}>Limpiar filtros</button></div>
    {filters.orderId && <p>Mostrando el historial de un pedido. Limpia los filtros para ver todos.</p>}
    {loading && <p role="status">Consultando actividad…</p>}
    {error && <p role="alert">{error} <button className="button button--line" onClick={() => void load()}>Reintentar</button></p>}
    {!loading && !error && feed && <><p className="audit-panel__count">{feed.total} eventos encontrados · {feed.entries.length} en esta página</p>
      {!feed.entries.length && <p>No hay actividad con estos filtros. Prueba otras fechas o personas.</p>}
      {groups.map(([key, group]) => <details className="audit-panel__group" key={key} open={grouped ? undefined : true}>
        <summary><strong>{group.title}</strong><span>{group.entries.length} {group.entries.length === 1 ? "evento" : "eventos"} en esta página · {dateLabel(group.entries[0].createdAt)}</span><small>{group.entries[0].summary}</small></summary>
        {grouped && group.entries[0]?.order && !filters.orderId && <button className="button button--line" onClick={() => { latest.current++; setFilters({ from: "", to: "", action: "", actorId: "", orderId: String(group.entries[0].order!.id) }); setPage(1); setFeed(null); }}>Ver todo el pedido</button>}
        {group.entries.map((entry) => <article className="audit-event" key={entry.id}><div><strong>{entry.title}</strong>{entry.intervention && <span className="audit-event__override">Intervención administrativa</span>}<p>{entry.summary}</p><time dateTime={entry.createdAt}>{dateLabel(entry.createdAt)}</time></div>
          <details><summary>Ver detalle</summary><dl><div><dt>Responsable</dt><dd>{entry.actorName}</dd></div>{entry.details.map((item, index) => <div key={`${item.label}-${index}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}<div><dt>Registro</dt><dd>{entry.id}</dd></div></dl></details>
        </article>)}
      </details>)}
      {(feed.totalPages > 1 || page > 1) && <nav className="delivery-pagination" aria-label="Páginas de auditoría"><button className="button button--line" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button><span>{page} / {feed.totalPages}</span><button className="button button--line" disabled={page >= feed.totalPages} onClick={() => setPage(page + 1)}>Siguiente</button></nav>}
    </>}
  </section>;
}
