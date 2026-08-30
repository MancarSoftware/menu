"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Home, MapPin, MessageCircle, Search, Sparkles, Utensils, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { MenuCategoryView, MenuItemView } from "@/lib/domain";
import { formatPrice } from "@/lib/format";
import { DishDialog } from "./dish-dialog";
import { filterMenu, type MenuFilter } from "./filter-menu";

const filters: { id: MenuFilter; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "vegetarian", label: "Vegetariano" },
  { id: "vegan", label: "Vegano" },
  { id: "gluten-free", label: "Sin gluten" },
  { id: "chef", label: "Chef" },
];

export function MenuExplorer({ categories, initialDishSlug, whatsapp }: { categories: MenuCategoryView[]; initialDishSlug?: string; whatsapp: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MenuFilter>("all");
  const [activeCategory, setActiveCategory] = useState(categories[0]?.slug ?? "");
  const [selectedItem, setSelectedItem] = useState<MenuItemView | null>(() => categories.flatMap((category) => category.items).find((item) => item.slug === initialDishSlug) ?? null);
  const filtered = useMemo(() => filterMenu(categories, query, filter), [categories, query, filter]);
  const resultCount = filtered.reduce((total, category) => total + category.items.length, 0);

  useEffect(() => {
    if (query || filter !== "all") return;
    const sections = document.querySelectorAll<HTMLElement>("[data-menu-section]");
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target.id) setActiveCategory(visible.target.id);
    }, { rootMargin: "-25% 0px -60%", threshold: [0.05, 0.3, 0.6] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [query, filter]);

  useEffect(() => {
    document.querySelectorAll<HTMLElement>(`[data-category="${activeCategory}"]`).forEach((active) => {
      if (active.closest(".menu-mobile-categories")) active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    });
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
    window.history.replaceState({}, "", `${url.pathname}${url.search ? url.search : ""}${url.hash}`);
  }

  function resetFilters() { setQuery(""); setFilter("all"); }

  return (
    <>
      <div className="menu-tools">
        <label className="menu-search"><Search aria-hidden="true" /><span className="sr-only">Buscar en la carta</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar platos o ingredientes..." />{query && <button type="button" onClick={() => setQuery("")} aria-label="Borrar búsqueda"><X aria-hidden="true" /></button>}</label>
        <select className="menu-filter" aria-label="Filtrar la carta" value={filter} onChange={(event) => setFilter(event.target.value as MenuFilter)}>{filters.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
        <p className="menu-tools__count" aria-live="polite">{resultCount} {resultCount === 1 ? "plato" : "platos"}</p>
      </div>

      <div className="menu-mobile-categories" aria-label="Categorías">
        {categories.map((category) => <a key={category.id} href={`#${category.slug}`} data-category={category.slug} data-active={activeCategory === category.slug} onClick={() => setActiveCategory(category.slug)}>{category.name}</a>)}
      </div>

      <div className="menu-layout">
        <div className="menu-content">
          {filtered.length ? filtered.map((category) => (
            <section id={category.slug} key={category.id} data-menu-section className="menu-category" aria-labelledby={`${category.slug}-title`}>
              <header className="menu-category__header"><div><p className="eyebrow">0{categories.findIndex((item) => item.id === category.id) + 1}</p><h2 id={`${category.slug}-title`}>{category.name}</h2></div><p>{category.description}</p></header>
              <div className="menu-category__items">
                {category.items.map((item, itemIndex) => (
                  <button className="menu-dish" type="button" key={item.id} onClick={() => openItem(item)} style={{ "--dish-delay": `${Math.min(itemIndex, 6) * 35}ms` } as React.CSSProperties}>
                    <span className="menu-dish__image"><Image src={item.imageUrl} alt="" fill sizes="(max-width: 760px) 112px, 148px" /></span>
                    <span className="menu-dish__copy"><span className="menu-dish__name">{item.name}{item.isChefRecommendation && <Sparkles aria-label="Selección del chef" />}</span><span className="menu-dish__description">{item.shortDescription}</span><span className="menu-dish__tags">{item.dietaryTags.slice(0, 2).join(" · ")}</span></span>
                    <span className="menu-dish__action"><strong>{formatPrice(item.priceCents)}</strong><span>Ver plato <ArrowUpRight aria-hidden="true" /></span></span>
                  </button>
                ))}
              </div>
            </section>
          )) : (
            <div className="menu-empty"><p className="eyebrow">Sin coincidencias</p><h2>No encontramos ese sabor.</h2><p>Prueba con otro ingrediente o vuelve a explorar la carta completa.</p><button className="button button--solid" type="button" onClick={resetFilters}>Limpiar filtros</button></div>
          )}
        </div>
      </div>
      <nav className="menu-bottom-nav" aria-label="Acciones rápidas">
        <Link href="/"><Home aria-hidden="true" /><span>Inicio</span></Link>
        <Link href="/menu" aria-current="page"><Utensils aria-hidden="true" /><span>Menú</span></Link>
        <Link href="/#visitanos"><MapPin aria-hidden="true" /><span>Visítanos</span></Link>
        <a href={`https://wa.me/${whatsapp}?text=Hola%2C%20quisiera%20reservar%20una%20mesa`} target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true" /><span>Reservar</span></a>
      </nav>
      <DishDialog item={selectedItem} onClose={closeItem} whatsapp={whatsapp} />
    </>
  );
}
