import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { MenuExplorer } from "@/features/menu/menu-explorer";
import { getPublicMenu, getRestaurant } from "@/lib/menu-repository";

export const metadata: Metadata = { title: "Carta", description: "Explora la carta de temporada de Brasa Norte: platos de fuego, producto ecuatoriano y coctelería de altura." };
export const revalidate = 30;

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ plato?: string }> }) {
  const { plato } = await searchParams;
  const [categories, restaurant] = await Promise.all([getPublicMenu(), getRestaurant()]);
  return (
    <main id="contenido" className="menu-page">
      <section className="menu-intro">
        <div><p className="eyebrow">Carta · Temporada 01 / 2026</p><h1>Menú</h1></div>
        <p>Producto ecuatoriano, fuego y temporada. Busca un plato o recorre la carta por categoría.</p>
      </section>
      {categories.length ? <MenuExplorer categories={categories} initialDishSlug={plato} whatsapp={restaurant.whatsapp} /> : <section className="menu-empty"><p className="eyebrow">Entre temporadas</p><h2>La nueva carta está por encenderse.</h2><p>Escríbenos para conocer lo que estamos sirviendo hoy.</p></section>}
      <SiteFooter restaurant={restaurant} />
    </main>
  );
}
