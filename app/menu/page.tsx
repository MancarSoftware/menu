import type { Metadata } from "next";
import { MenuExplorer } from "@/features/menu/menu-explorer";
import { getPublicMenu, getRestaurant } from "@/lib/menu-repository";
import { getDiningTableSession } from "@/lib/table-session";

export const metadata: Metadata = { title: "Menú", description: "Explora hamburguesas, pizzas, combos y bebidas de El Bueno." };
export const dynamic = "force-dynamic";

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ plato?: string; sesion?: string }> }) {
  const { plato, sesion } = await searchParams;
  const [categories, restaurant, table] = await Promise.all([getPublicMenu(), getRestaurant(), getDiningTableSession()]);
  const headingCopy = table
    ? `Estás ordenando desde ${table.name} · Mesa ${table.number}`
    : sesion === "finalizada"
      ? "Pago registrado. Gracias por visitarnos; ahora puedes pedir para delivery o retiro."
      : "Elige, agrega y ordena a tu manera.";
  return (
    <main id="contenido" className="fast-page menu-page">
      <section className="menu-heading"><h1 className="sr-only">Menú</h1><p>{headingCopy}</p></section>
      {categories.length ? <MenuExplorer categories={categories} initialDishSlug={plato} whatsapp={restaurant.whatsapp} dineInTable={table ? { number: table.number, name: table.name } : null} /> : <section className="menu-empty"><h2>Estamos preparando el menú</h2><p>Vuelve pronto o escríbenos para conocer lo disponible.</p></section>}
    </main>
  );
}
