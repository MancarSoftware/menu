"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Banknote, BarChart3, Check, ChefHat, ChevronRight, CircleOff, Edit3, ExternalLink, ImagePlus, LayoutList, LogOut, MapPinned, Plus, QrCode, Search, Trash2, UserRoundCog, UtensilsCrossed, X } from "lucide-react";
import type { AdminMetricsView, DiningTableView, MenuCategoryView, MenuItemView, OrderView, RestaurantView, StaffRole } from "@/lib/domain";
import { getBusinessDate } from "@/lib/business-date";
import { formatPrice, slugify } from "@/lib/format";
import { requestJson, SessionExpiredError } from "./admin-api";
import { KitchenBoard } from "./kitchen-board";
import { TableManager } from "./table-manager";
import { ReportsPanel } from "./reports-panel";
import { CashRegister } from "./cash-register";
import { StaffManager } from "./staff-manager";
import { DeliveryBoard } from "./delivery-board";
import { useBusinessToday } from "./use-business-today";
import { useLiveRefresh } from "./use-live-refresh";

type Tab = "overview" | "orders" | "deliveries" | "reports" | "cash" | "tables" | "categories" | "items" | "restaurant" | "staff";
type Notice = { kind: "success" | "error"; message: string } | null;
const tabStorageKey = "el-bueno-admin-section-v1";

function canOpenTab(value: string, role: StaffRole): value is Tab {
  if (["orders", "staff"].includes(value)) return true;
  if (["overview", "reports", "cash", "deliveries"].includes(value)) return ["ADMIN", "CASHIER"].includes(role);
  return role === "ADMIN" && ["tables", "categories", "items", "restaurant"].includes(value);
}

export function AdminDashboard({ categories, restaurant, tables, orders, initialMetrics, userEmail, role }: { categories: MenuCategoryView[]; restaurant: RestaurantView; tables: DiningTableView[]; orders: OrderView[]; initialMetrics: AdminMetricsView; userEmail: string; role: StaffRole }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(["ADMIN", "CASHIER"].includes(role) ? "overview" : "orders");
  const [sectionRestored, setSectionRestored] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [metrics, setMetrics] = useState(initialMetrics);
  const today = useBusinessToday();
  const [selectedRevenueDate, setSelectedRevenueDate] = useState<string | null>(null);
  const revenueDate = selectedRevenueDate ?? today;
  const setRevenueDate = (date: string) => setSelectedRevenueDate(date === today ? null : date);
  const items = categories.flatMap((category) => category.items);
  const available = items.filter((item) => item.isAvailable).length;

  useEffect(() => {
    let cancelled = false;
    let storedTab: Tab | null = null;
    try {
      const stored = window.sessionStorage.getItem(tabStorageKey);
      if (stored && canOpenTab(stored, role)) storedTab = stored;
    } catch { /* Session storage is optional; server permissions remain authoritative. */ }
    queueMicrotask(() => {
      if (cancelled) return;
      if (storedTab) setTab(storedTab);
      setSectionRestored(true);
    });
    return () => { cancelled = true; };
  }, [role]);

  useEffect(() => {
    if (!sectionRestored) return;
    try { window.sessionStorage.setItem(tabStorageKey, tab); } catch { /* Keep navigation usable. */ }
  }, [sectionRestored, tab]);

  const refreshMetrics = useCallback(async (date = revenueDate) => {
    try {
      const result = await requestJson<{ metrics: AdminMetricsView }>(`/api/admin/metrics?date=${encodeURIComponent(date)}`);
      setMetrics(result.metrics);
    } catch (error) {
      if (error instanceof SessionExpiredError) router.push("/admin/login");
    }
  }, [revenueDate, router]);

  const refreshCurrentMetrics = useCallback(() => refreshMetrics(), [refreshMetrics]);
  useLiveRefresh(refreshCurrentMetrics, ["ADMIN", "CASHIER"].includes(role));

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  async function run(action: () => Promise<void>, success: string) {
    setNotice(null);
    try { await action(); setNotice({ kind: "success", message: success }); router.refresh(); }
    catch (error) { if (error instanceof SessionExpiredError) router.push("/admin/login"); setNotice({ kind: "error", message: error instanceof Error ? error.message : "Ocurrió un error." }); throw error; }
  }

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await requestJson("/api/auth/logout", "POST");
      try { window.sessionStorage.removeItem(tabStorageKey); } catch { /* Storage may be blocked. */ }
      router.replace("/admin/login"); router.refresh();
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "No pudimos cerrar la sesión. Inténtalo otra vez." });
      setLoggingOut(false);
    }
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div><p className="eyebrow">El Bueno</p><strong>Panel del menú</strong></div>
        <nav aria-label="Secciones de administración">
          {["ADMIN", "CASHIER"].includes(role) && <button data-active={tab === "overview"} onClick={() => setTab("overview")}><LayoutList aria-hidden="true" />Resumen</button>}
          <button data-active={tab === "orders"} onClick={() => setTab("orders")}><ChefHat aria-hidden="true" />Cocina</button>
          {["ADMIN", "CASHIER"].includes(role) && <button data-active={tab === "deliveries"} onClick={() => setTab("deliveries")}><MapPinned aria-hidden="true" />Repartos</button>}
          {["ADMIN", "CASHIER"].includes(role) && <button data-active={tab === "reports"} onClick={() => setTab("reports")}><BarChart3 aria-hidden="true" />Ventas</button>}
          {["ADMIN", "CASHIER"].includes(role) && <button data-active={tab === "cash"} onClick={() => setTab("cash")}><Banknote aria-hidden="true" />Caja</button>}
          {role === "ADMIN" && <button data-active={tab === "tables"} onClick={() => setTab("tables")}><QrCode aria-hidden="true" />Mesas y QR</button>}
          {role === "ADMIN" && <button data-active={tab === "categories"} onClick={() => setTab("categories")}><ChevronRight aria-hidden="true" />Categorías</button>}
          {role === "ADMIN" && <button data-active={tab === "items"} onClick={() => setTab("items")}><UtensilsCrossed aria-hidden="true" />Productos</button>}
          {role === "ADMIN" && <button data-active={tab === "restaurant"} onClick={() => setTab("restaurant")}><MapPinned aria-hidden="true" />Restaurante</button>}
          <button data-active={tab === "staff"} onClick={() => setTab("staff")}><UserRoundCog aria-hidden="true" />{role === "ADMIN" ? "Equipo" : "Mi acceso"}</button>
        </nav>
        <div className="admin-sidebar__footer"><span>{userEmail}</span><button type="button" disabled={loggingOut} onClick={() => void logout()}><LogOut aria-hidden="true" />{loggingOut ? "Saliendo…" : "Cerrar sesión"}</button></div>
      </aside>

      <section className="admin-workspace">
        <header className="admin-topbar"><div><p className="eyebrow">Operación / {new Date().toLocaleDateString("es-EC")}</p><h1>{tab === "overview" ? "Resumen" : tab === "orders" ? "Cocina" : tab === "deliveries" ? "Repartos" : tab === "reports" ? "Ventas" : tab === "cash" ? "Caja" : tab === "tables" ? "Mesas" : tab === "categories" ? "Categorías" : tab === "items" ? "Productos" : tab === "staff" ? role === "ADMIN" ? "Equipo y seguridad" : "Mi acceso" : "El local"}</h1></div><a className="button button--line" href="/menu" target="_blank">Ver menú <ExternalLink aria-hidden="true" /></a></header>
        {notice && <div className="admin-notice" data-kind={notice.kind} role="status">{notice.kind === "success" ? <Check aria-hidden="true" /> : <CircleOff aria-hidden="true" />}{notice.message}<button onClick={() => setNotice(null)} aria-label="Cerrar aviso"><X aria-hidden="true" /></button></div>}

        {tab === "overview" && <Overview categories={categories} itemCount={items.length} availableCount={available} metrics={metrics} revenueDate={revenueDate} onRevenueDateChange={(date) => { setRevenueDate(date); void refreshMetrics(date); }} onNavigate={setTab} />}
        <div hidden={tab !== "orders"}><KitchenBoard initialOrders={orders} role={role} onPaymentRecorded={() => { void refreshMetrics(); }} /></div>
        {["ADMIN", "CASHIER"].includes(role) && <div hidden={tab !== "deliveries"}><DeliveryBoard manager /></div>}
        {tab === "reports" && <ReportsPanel />}
        {tab === "cash" && <CashRegister />}
        {tab === "tables" && <TableManager initialTables={tables} />}
        {tab === "categories" && <CategoryManager categories={categories} run={run} />}
        {tab === "items" && <ItemManager categories={categories} run={run} />}
        {tab === "restaurant" && <RestaurantManager restaurant={restaurant} run={run} />}
        {tab === "staff" && <StaffManager canManage={role === "ADMIN"} />}
      </section>
    </div>
  );
}

function Overview({ categories, itemCount, availableCount, metrics, revenueDate, onRevenueDateChange, onNavigate }: { categories: MenuCategoryView[]; itemCount: number; availableCount: number; metrics: AdminMetricsView; revenueDate: string; onRevenueDateChange: (date: string) => void; onNavigate: (tab: Tab) => void }) {
  return (
    <div className="admin-overview">
      <section className="admin-kpis"><div><span>Categorías activas</span><strong>{categories.filter((item) => item.isActive).length}<small> / {categories.length}</small></strong></div><div><span>Productos disponibles</span><strong>{availableCount}<small> / {itemCount}</small></strong></div><div><span>Destacados</span><strong>{categories.flatMap((c) => c.items).filter((i) => i.isFeatured).length}</strong></div><div className="admin-kpi-revenue"><label htmlFor="revenue-date"><span>Ingresos del día</span><input id="revenue-date" type="date" value={revenueDate} max={getBusinessDate()} onChange={(event) => { if (event.target.value) onRevenueDateChange(event.target.value); }} /></label><strong className="admin-kpi-money">{formatPrice(metrics.revenueCents)}<small>{metrics.paidOrderCount === 1 ? "1 cobro" : `${metrics.paidOrderCount} cobros`}</small></strong></div></section>
      <section className="admin-overview__lead"><p className="eyebrow">Estado del menú</p><h2>{availableCount === itemCount ? "Todo está disponible." : `${itemCount - availableCount} productos agotados.`}</h2><p>Los cambios publicados se reflejan en el menú público al actualizar la página.</p><button className="button button--solid" onClick={() => onNavigate("items")}>Gestionar productos</button></section>
      <section className="admin-category-status"><header><h2>Lectura por categoría</h2><button onClick={() => onNavigate("categories")}>Ordenar categorías →</button></header>{categories.map((category) => <div key={category.id}><span className="status-dot" data-active={category.isActive} /><strong>{category.name}</strong><span>{category.items.filter((item) => item.isAvailable).length} de {category.items.length} disponibles</span></div>)}</section>
    </div>
  );
}

const emptyCategory = { name: "", slug: "", description: "", displayOrder: 0, isActive: true };

function CategoryManager({ categories, run }: { categories: MenuCategoryView[]; run: (action: () => Promise<void>, success: string) => Promise<void> }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCategory);
  const [pending, setPending] = useState(false);

  function edit(category: MenuCategoryView) { setEditingId(category.id); setForm({ name: category.name, slug: category.slug, description: category.description, displayOrder: category.displayOrder, isActive: category.isActive }); }
  function reset() { setEditingId(null); setForm({ ...emptyCategory, displayOrder: categories.length }); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setPending(true);
    try { await run(() => requestJson(editingId ? `/api/categories/${editingId}` : "/api/categories", editingId ? "PATCH" : "POST", form).then(() => undefined), editingId ? "Categoría actualizada." : "Categoría creada."); reset(); } finally { setPending(false); }
  }
  async function toggle(category: MenuCategoryView) { await run(() => requestJson(`/api/categories/${category.id}`, "PATCH", { name: category.name, slug: category.slug, description: category.description, displayOrder: category.displayOrder, isActive: !category.isActive }).then(() => undefined), category.isActive ? "Categoría desactivada." : "Categoría activada."); }
  async function remove(category: MenuCategoryView) { if (!window.confirm(`¿Eliminar “${category.name}”? Solo es posible si no contiene platos.`)) return; await run(() => requestJson(`/api/categories/${category.id}`, "DELETE").then(() => undefined), "Categoría eliminada."); }
  async function move(index: number, direction: -1 | 1) { const next = index + direction; if (next < 0 || next >= categories.length) return; const ids = categories.map((item) => item.id); [ids[index], ids[next]] = [ids[next], ids[index]]; await run(() => requestJson("/api/categories/reorder", "PATCH", { ids }).then(() => undefined), "Orden actualizado."); }

  return (
    <div className="admin-split">
      <section className="admin-list"><header><div><p className="eyebrow">Estructura</p><h2>{categories.length} categorías</h2></div><button className="button button--solid" onClick={reset}><Plus aria-hidden="true" />Nueva</button></header><div className="admin-list__rows">{categories.map((category, index) => <article key={category.id} className="admin-category-row" data-inactive={!category.isActive}><div className="admin-row__order"><button onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Subir ${category.name}`}><ArrowUp /></button><button onClick={() => move(index, 1)} disabled={index === categories.length - 1} aria-label={`Bajar ${category.name}`}><ArrowDown /></button></div><div><strong>{category.name}</strong><span>{category.items.length} platos · /{category.slug}</span></div><button className="admin-status-button" onClick={() => toggle(category)} data-active={category.isActive}>{category.isActive ? "Activa" : "Oculta"}</button><button className="icon-button" onClick={() => edit(category)} aria-label={`Editar ${category.name}`}><Edit3 /></button><button className="icon-button icon-button--danger" onClick={() => remove(category)} aria-label={`Eliminar ${category.name}`}><Trash2 /></button></article>)}</div></section>
      <form className="admin-editor" onSubmit={submit}><header><p className="eyebrow">{editingId ? "Editar categoría" : "Nueva categoría"}</p><h2>{editingId ? form.name : "Crear sección"}</h2></header><div className="form-field"><label htmlFor="category-name">Nombre</label><input id="category-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editingId ? form.slug : slugify(e.target.value) })} required minLength={2} /></div><div className="form-field"><label htmlFor="category-slug">Identificador URL</label><input id="category-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} required /></div><div className="form-field"><label htmlFor="category-description">Descripción</label><textarea id="category-description" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required minLength={5} /></div><label className="check-field"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /><span>Visible en la carta pública</span></label><div className="admin-editor__actions"><button type="button" className="button button--line" onClick={reset}>Limpiar</button><button type="submit" className="button button--solid" disabled={pending}>{pending ? "Guardando…" : editingId ? "Guardar cambios" : "Crear categoría"}</button></div></form>
    </div>
  );
}

type ItemForm = { name: string; slug: string; shortDescription: string; description: string; price: string; imageUrl: string; categoryId: string; isAvailable: boolean; isFeatured: boolean; isChefRecommendation: boolean; displayOrder: number; dietaryTags: string; ingredients: string; allergens: string; spicyLevel: string };
function emptyItem(categories: MenuCategoryView[]): ItemForm { return { name: "", slug: "", shortDescription: "", description: "", price: "", imageUrl: "/images/fast-food/burger-classic.webp", categoryId: categories[0]?.id ?? "", isAvailable: true, isFeatured: false, isChefRecommendation: false, displayOrder: 0, dietaryTags: "", ingredients: "", allergens: "", spicyLevel: "" }; }
function list(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean); }

function ItemManager({ categories, run }: { categories: MenuCategoryView[]; run: (action: () => Promise<void>, success: string) => Promise<void> }) {
  const allItems = useMemo(() => categories.flatMap((category) => category.items), [categories]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemForm>(() => emptyItem(categories));
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const visible = allItems.filter((item) => (categoryFilter === "all" || item.categoryId === categoryFilter) && `${item.name} ${item.shortDescription}`.toLowerCase().includes(query.toLowerCase()));

  function reset() { setEditingId(null); setForm(emptyItem(categories)); }
  function edit(item: MenuItemView) { setEditingId(item.id); setForm({ name: item.name, slug: item.slug, shortDescription: item.shortDescription, description: item.description, price: (item.priceCents / 100).toFixed(2), imageUrl: item.imageUrl, categoryId: item.categoryId, isAvailable: item.isAvailable, isFeatured: item.isFeatured, isChefRecommendation: item.isChefRecommendation, displayOrder: item.displayOrder, dietaryTags: item.dietaryTags.join(", "), ingredients: item.ingredients.join(", "), allergens: item.allergens.join(", "), spicyLevel: item.spicyLevel === null ? "" : String(item.spicyLevel) }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function payload() { return { name: form.name, slug: form.slug, shortDescription: form.shortDescription, description: form.description, priceCents: Math.round(Number(form.price) * 100), imageUrl: form.imageUrl, categoryId: form.categoryId, isAvailable: form.isAvailable, isFeatured: form.isFeatured, isChefRecommendation: form.isChefRecommendation, displayOrder: form.displayOrder, dietaryTags: list(form.dietaryTags), ingredients: list(form.ingredients), allergens: list(form.allergens), spicyLevel: form.spicyLevel === "" ? null : Number(form.spicyLevel) }; }
  async function submit(event: React.FormEvent) { event.preventDefault(); setPending(true); try { await run(() => requestJson(editingId ? `/api/items/${editingId}` : "/api/items", editingId ? "PATCH" : "POST", payload()).then(() => undefined), editingId ? "Producto actualizado y publicado." : "Producto creado y publicado."); reset(); } finally { setPending(false); } }
  async function remove(item: MenuItemView) { if (!window.confirm(`¿Eliminar “${item.name}”? Esta acción no se puede deshacer.`)) return; await run(() => requestJson(`/api/items/${item.id}`, "DELETE").then(() => undefined), "Producto eliminado."); if (editingId === item.id) reset(); }
  async function toggle(item: MenuItemView) { await run(() => requestJson(`/api/items/${item.id}`, "PATCH", { ...item, categoryName: undefined, categorySlug: undefined, priceCents: item.priceCents, dietaryTags: item.dietaryTags, ingredients: item.ingredients, allergens: item.allergens, isAvailable: !item.isAvailable }).then(() => undefined), item.isAvailable ? "Producto marcado como no disponible." : "Producto disponible nuevamente."); }
  async function move(item: MenuItemView, direction: -1 | 1) { const group = categories.find((category) => category.id === item.categoryId)?.items ?? []; const index = group.findIndex((candidate) => candidate.id === item.id); const next = index + direction; if (next < 0 || next >= group.length) return; const ids = group.map((candidate) => candidate.id); [ids[index], ids[next]] = [ids[next], ids[index]]; await run(() => requestJson("/api/items/reorder", "PATCH", { ids }).then(() => undefined), "Orden de productos actualizado."); }
  async function upload(file: File) { setUploading(true); try { const data = new FormData(); data.set("file", file); const response = await fetch("/api/uploads", { method: "POST", body: data }); const result = await response.json() as { url?: string; error?: string }; if (!response.ok || !result.url) throw new Error(result.error ?? "No pudimos subir la imagen."); setForm((current) => ({ ...current, imageUrl: result.url! })); } finally { setUploading(false); } }

  return (
    <div className="admin-items-layout">
      <form className="admin-editor admin-item-editor" onSubmit={submit}>
        <header><p className="eyebrow">{editingId ? "Editar producto" : "Alta de producto"}</p><h2>{editingId ? form.name : "Nuevo producto"}</h2></header>
        <div className="admin-image-field">
          <div>{form.imageUrl && <Image src={form.imageUrl} alt="Vista previa" fill sizes="300px" />}</div>
          <label className="button button--line"><ImagePlus aria-hidden="true" />{uploading ? "Subiendo…" : "Cambiar imagen"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file).catch((error) => window.alert(error.message)); }} /></label>
        </div>
        <div className="form-grid">
          <div className="form-field"><label htmlFor="item-name">Nombre</label><input id="item-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editingId ? form.slug : slugify(e.target.value) })} required /></div>
          <div className="form-field"><label htmlFor="item-price">Precio USD</label><input id="item-price" type="number" inputMode="decimal" step="0.01" min="0.01" max="100000" value={form.price} onKeyDown={(event) => { if (["e", "E", "+", "-"].includes(event.key)) event.preventDefault(); }} onChange={(e) => { if (/^\d*(?:\.\d{0,2})?$/.test(e.target.value)) setForm({ ...form, price: e.target.value }); }} required /></div>
        </div>
        <div className="form-grid">
          <div className="form-field"><label htmlFor="item-slug">Identificador URL</label><input id="item-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} required /></div>
          <div className="form-field"><label htmlFor="item-category">Categoría</label><select id="item-category" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
        </div>
        <div className="form-field"><label htmlFor="item-short">Descripción breve</label><input id="item-short" value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} required maxLength={180} /></div>
        <div className="form-field"><label htmlFor="item-description">Descripción completa</label><textarea id="item-description" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
        <div className="form-field"><label htmlFor="item-ingredients">Ingredientes <small>separados por coma</small></label><input id="item-ingredients" value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} /></div>
        <div className="form-grid">
          <div className="form-field"><label htmlFor="item-tags">Etiquetas dietarias</label><input id="item-tags" value={form.dietaryTags} onChange={(e) => setForm({ ...form, dietaryTags: e.target.value })} placeholder="Vegano, Sin gluten" /></div>
          <div className="form-field"><label htmlFor="item-allergens">Alérgenos</label><input id="item-allergens" value={form.allergens} onChange={(e) => setForm({ ...form, allergens: e.target.value })} placeholder="Lácteos, Frutos secos" /></div>
        </div>
        <div className="form-grid form-grid--checks">
          <label className="check-field"><input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} /><span>Disponible</span></label>
          <label className="check-field"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /><span>Destacado</span></label>
          <label className="check-field"><input type="checkbox" checked={form.isChefRecommendation} onChange={(e) => setForm({ ...form, isChefRecommendation: e.target.checked })} /><span>Recomendado</span></label>
          <div className="form-field"><label htmlFor="item-spicy">Picante 0–3</label><select id="item-spicy" value={form.spicyLevel} onChange={(e) => setForm({ ...form, spicyLevel: e.target.value })}><option value="">No aplica</option><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></div>
        </div>
        <div className="admin-editor__actions"><button type="button" className="button button--line" onClick={reset}>Limpiar</button><button type="submit" className="button button--solid" disabled={pending || uploading}>{pending ? "Publicando…" : editingId ? "Guardar producto" : "Publicar producto"}</button></div>
      </form>
      <section className="admin-list admin-item-list"><header><div><p className="eyebrow">Carta completa</p><h2>{allItems.length} platos</h2></div><button className="button button--solid" onClick={reset}><Plus />Nuevo</button></header><div className="admin-item-tools"><label><Search /><input placeholder="Buscar plato" value={query} onChange={(e) => setQuery(e.target.value)} /></label><select aria-label="Filtrar por categoría" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="all">Todas las categorías</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></div><div className="admin-list__rows">{visible.map((item) => <article className="admin-item-row" key={item.id} data-inactive={!item.isAvailable}><div className="admin-item-row__image"><Image src={item.imageUrl} alt="" fill sizes="64px" /></div><div><span className="eyebrow">{item.categoryName}</span><strong>{item.name}</strong><small>{formatPrice(item.priceCents)}</small></div><button className="admin-status-button" data-active={item.isAvailable} onClick={() => toggle(item)}>{item.isAvailable ? "Disponible" : "Agotado"}</button><div className="admin-row__order"><button onClick={() => move(item, -1)} aria-label={`Subir ${item.name}`}><ArrowUp /></button><button onClick={() => move(item, 1)} aria-label={`Bajar ${item.name}`}><ArrowDown /></button></div><button className="icon-button" onClick={() => edit(item)} aria-label={`Editar ${item.name}`}><Edit3 /></button><button className="icon-button icon-button--danger" onClick={() => remove(item)} aria-label={`Eliminar ${item.name}`}><Trash2 /></button></article>)}</div></section>
    </div>
  );
}

function RestaurantManager({ restaurant, run }: { restaurant: RestaurantView; run: (action: () => Promise<void>, success: string) => Promise<void> }) {
  const [form, setForm] = useState({ ...restaurant, openingText: restaurant.openingHours.map((item) => `${item.days} | ${item.hours}`).join("\n"), instagram: restaurant.socialLinks.instagram ?? "", facebook: restaurant.socialLinks.facebook ?? "", tiktok: restaurant.socialLinks.tiktok ?? "" });
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    setPending(true);
    const openingHours = form.openingText.split("\n").map((line) => {
      const [days, hours] = line.split("|").map((value) => value.trim());
      return { days, hours };
    }).filter((item) => item.days && item.hours);

    try {
      await run(() => requestJson("/api/restaurant", "PATCH", {
        name: form.name,
        tagline: form.tagline,
        description: form.description,
        address: form.address,
        city: form.city,
        countryCode: form.countryCode,
        latitude: form.latitude,
        longitude: form.longitude,
        phone: form.phone,
        whatsapp: form.whatsapp,
        email: form.email.trim().toLowerCase(),
        openingHours,
        socialLinks: { instagram: form.instagram, facebook: form.facebook, tiktok: form.tiktok },
      }).then(() => undefined), "Información del local actualizada.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="restaurant-editor" onSubmit={submit}>
      <section>
        <p className="eyebrow">Identidad pública</p>
        <h2>Información del local</h2>
        <p>Estos datos alimentan la portada, el mapa, el contacto y los pedidos por WhatsApp.</p>
      </section>
      <div className="restaurant-editor__form">
        <div className="form-grid">
          <div className="form-field"><label htmlFor="rest-name">Nombre</label><input id="rest-name" required minLength={2} maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="form-field"><label htmlFor="rest-email">Correo</label><input id="rest-email" type="email" inputMode="email" required maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="hola@elbueno.ec" /></div>
        </div>
        <div className="form-field"><label htmlFor="rest-tagline">Frase principal</label><input id="rest-tagline" required minLength={5} maxLength={160} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></div>
        <div className="form-field"><label htmlFor="rest-description">Descripción</label><textarea id="rest-description" required minLength={20} maxLength={1000} rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="form-field"><label htmlFor="rest-address">Dirección</label><input id="rest-address" required minLength={5} maxLength={240} autoComplete="street-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div className="form-grid">
          <div className="form-field"><label htmlFor="rest-city">Ciudad</label><input id="rest-city" required minLength={2} maxLength={100} autoComplete="address-level2" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div className="form-field"><label htmlFor="rest-country">País</label><select id="rest-country" value={form.countryCode} disabled><option value="EC">Ecuador</option></select></div>
        </div>
        <div className="form-grid">
          <div className="form-field"><label htmlFor="rest-latitude">Latitud</label><input id="rest-latitude" type="number" inputMode="decimal" required step="0.000001" min="-90" max="90" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })} /></div>
          <div className="form-field"><label htmlFor="rest-longitude">Longitud</label><input id="rest-longitude" type="number" inputMode="decimal" required step="0.000001" min="-180" max="180" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })} /></div>
        </div>
        <div className="form-grid">
          <div className="form-field"><label htmlFor="rest-phone">Teléfono</label><input id="rest-phone" type="tel" inputMode="tel" required minLength={7} maxLength={20} pattern="\+?[0-9\s-]{7,20}" title="Usa únicamente números, espacios, guiones y un + inicial opcional." value={form.phone} onChange={(e) => { if (/^\+?[0-9\s-]*$/.test(e.target.value)) setForm({ ...form, phone: e.target.value }); }} placeholder="+593 2 255 5555" /></div>
          <div className="form-field"><label htmlFor="rest-whatsapp">WhatsApp <small>593 + 9 dígitos</small></label><input id="rest-whatsapp" type="tel" inputMode="numeric" required minLength={12} maxLength={12} pattern="593[0-9]{9}" title="Debe comenzar con 593 y contener 12 dígitos." value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value.replace(/\D/g, "").slice(0, 12) })} placeholder="593995555555" /></div>
        </div>
        <div className="form-field"><label htmlFor="rest-hours">Horarios <small>una línea por rango: días | horas</small></label><textarea id="rest-hours" required minLength={5} maxLength={1200} rows={4} value={form.openingText} onChange={(e) => setForm({ ...form, openingText: e.target.value })} /></div>
        <div className="form-grid">
          <div className="form-field"><label htmlFor="rest-instagram">Instagram</label><input id="rest-instagram" type="url" maxLength={500} value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="https://instagram.com/elbueno" /></div>
          <div className="form-field"><label htmlFor="rest-facebook">Facebook</label><input id="rest-facebook" type="url" maxLength={500} value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} placeholder="https://facebook.com/elbueno" /></div>
        </div>
        <div className="admin-editor__actions"><button type="submit" className="button button--solid button--large" disabled={pending}>{pending ? "Guardando…" : "Guardar y publicar"}</button></div>
      </div>
    </form>
  );
}
