"use client";

import Image from "next/image";
import { Check, Search, ShoppingCart, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/features/cart/cart-context";
import type { MenuCategoryView, MenuItemView } from "@/lib/domain";
import { formatPrice } from "@/lib/format";
import { DishDialog } from "./dish-dialog";
import { filterMenu, type MenuFilter } from "./filter-menu";

const filters: { id: MenuFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "vegetarian", label: "Vegetariano" },
  { id: "vegan", label: "Vegano" },
  { id: "gluten-free", label: "Sin gluten" },
  { id: "chef", label: "Recomendados" },
];

export function MenuExplorer({ categories, initialDishSlug, whatsapp, dineInTable }: { categories: MenuCategoryView[]; initialDishSlug?: string; whatsapp: string; dineInTable: { number: number; name: string } | null }) {
  const { addItem } = useCart();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MenuFilter>("all");
  const [activeCategory, setActiveCategory] = useState(categories[0]?.slug ?? "");
  const [selectedItem, setSelectedItem] = useState<MenuItemView | null>(() => categories.flatMap((category) => category.items).find((item) => item.slug === initialDishSlug) ?? null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const filtered = useMemo(() => filterMenu(categories, query, filter), [categories, query, filter]);
  const resultCount = filtered.reduce((total, category) => total + category.items.length, 0);

  useEffect(() => {
    if (query || filter !== "all") return;
    const sections = document.querySelectorAll<HTMLElement>("[data-menu-section]");
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target.id) setActiveCategory(visible.target.id);
    }, { rootMargin: "-30% 0px -58%", threshold: [0.05, 0.3, 0.6] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [query, filter]);

  useEffect(() => {
    document.querySelector<HTMLElement>(`[data-category="${activeCategory}"]`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeCategory]);

  function openItem(item: MenuItemView) {
    setSelectedItem(item);
    const url = new URL(window.location.href);
    url.searchParams.set("plato", item.slug);
    window.history.replaceState({}, "", `${url.pathname}?${url.searchParams.toString()}#${item.categorySlug}`);
  }

  function closeItem() {
    setSelectedItem(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("plato");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function add(item: MenuItemView) {
    addItem(item);
    setAddedId(item.id);
    window.setTimeout(() => setAddedId((current) => current === item.id ? null : current), 1400);
  }

  return (
    <>
      <div className="menu-controls" id="menu-top">
        <label className="menu-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Buscar en el menú</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar platos..." />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Borrar búsqueda"><X aria-hidden="true" /></button>}
        </label>
        <select className="menu-filter" aria-label="Filtrar el menú" value={filter} onChange={(event) => setFilter(event.target.value as MenuFilter)}>
          {filters.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </div>

      <nav className="category-tabs" aria-label="Categorías del menú">
        {categories.map((category) => <a key={category.id} href={`#${category.slug}`} data-category={category.slug} data-active={activeCategory === category.slug} onClick={() => setActiveCategory(category.slug)}>{category.name}</a>)}
      </nav>

      <div className="menu-results-count" aria-live="polite">{resultCount} {resultCount === 1 ? "producto" : "productos"}</div>

      <div className="menu-catalogue">
        {filtered.length ? filtered.map((category) => (
          <section id={category.slug} key={category.id} data-menu-section className="menu-category" aria-labelledby={`${category.slug}-title`}>
            <header className="menu-category__header">
              <div><h2 id={`${category.slug}-title`}>{category.name}</h2><span>{category.items.length}</span></div>
              <p>{category.description}</p>
            </header>
            <div className="menu-list">
              {category.items.map((item) => (
                <article className="menu-product" key={item.id}>
                  <button className="menu-product__detail" type="button" onClick={() => openItem(item)} aria-label={`Ver detalles de ${item.name}`}>
                    <span className="menu-product__image"><Image src={item.imageUrl} alt="" fill sizes="(max-width: 700px) 108px, 138px" /></span>
                    <span className="menu-product__copy">
                      <span className="menu-product__name">{item.name}{item.isChefRecommendation && <Sparkles aria-label="Recomendado" />}</span>
                      <span className="menu-product__description">{item.shortDescription}</span>
                      <strong>{formatPrice(item.priceCents)}</strong>
                    </span>
                  </button>
                  <button className="menu-product__add" type="button" onClick={() => add(item)} data-added={addedId === item.id} aria-label={`Agregar ${item.name} al carrito`}>
                    {addedId === item.id ? <Check aria-hidden="true" /> : <ShoppingCart aria-hidden="true" />}
                    <span>{addedId === item.id ? "Agregado" : "Agregar"}</span>
                  </button>
                </article>
              ))}
            </div>
          </section>
        )) : (
          <section className="menu-empty">
            <h2>No encontramos ese producto</h2>
            <p>Prueba otra búsqueda o cambia el filtro para seguir explorando.</p>
            <button className="primary-button" type="button" onClick={() => { setQuery(""); setFilter("all"); }}>Ver todo el menú</button>
          </section>
        )}
      </div>

      <p className="sr-only" aria-live="polite">{addedId ? "Producto agregado al carrito" : ""}</p>
      <DishDialog item={selectedItem} onClose={closeItem} whatsapp={whatsapp} dineInTable={dineInTable} />
    </>
  );
}
