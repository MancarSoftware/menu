import type { Metadata } from "next";
import { MenuExplorer } from "@/features/menu/menu-explorer";
import { getPublicMenu, getRestaurant } from "@/lib/menu-repository";

export const metadata: Metadata = { title: "Menú", description: "Explora hamburguesas, pizzas, combos y bebidas de El Bueno." };
export const revalidate = 30;

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ plato?: string }> }) {
  const { plato } = await searchParams;
  const [categories, restaurant] = await Promise.all([getPublicMenu(), getRestaurant()]);
  return (
    <main id="contenido" className="fast-page menu-page">
      <section className="menu-heading"><h1 className="sr-only">Menú</h1><p>Elige, agrega y ordena por WhatsApp.</p></section>
      {categories.length ? <MenuExplorer categories={categories} initialDishSlug={plato} whatsapp={restaurant.whatsapp} /> : <section className="menu-empty"><h2>Estamos preparando el menú</h2><p>Vuelve pronto o escríbenos para conocer lo disponible.</p></section>}
    </main>
  );
}
