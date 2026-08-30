import type { Metadata } from "next";
import Image from "next/image";
import { getRestaurant } from "@/lib/menu-repository";

export const metadata: Metadata = { title: "Sobre nosotros" };

const values = [
  { title: "Calidad", copy: "Ingredientes seleccionados y preparaciones hechas al momento.", image: "/images/fast-food/quality.webp" },
  { title: "Frescura", copy: "Productos frescos para que cada pedido llegue como debe.", image: "/images/fast-food/freshness.webp" },
  { title: "Servicio", copy: "Atención rápida, cercana y lista para ayudarte.", image: "/images/fast-food/service.webp" },
];

export default async function AboutPage() {
  const restaurant = await getRestaurant();
  return <main id="contenido" className="fast-page info-page about-page">
    <div className="about-hero"><Image src="/images/fast-food/storefront.webp" alt="Fachada de El Bueno" fill priority sizes="(max-width: 760px) 100vw, 1120px" /></div>
    <section className="about-story"><p className="section-kicker">Nuestra historia</p><h1>Comida sencilla, hecha muy bien.</h1><p>{restaurant.description} Nuestro objetivo es servir comida rápida sin perder frescura, sabor ni una atención cercana.</p></section>
    <section className="values-section" aria-labelledby="values-title"><h2 id="values-title">Nuestra filosofía</h2><div>{values.map((value) => <article key={value.title}><span><Image src={value.image} alt="" fill sizes="64px" /></span><p><strong>{value.title}</strong>{value.copy}</p></article>)}</div></section>
  </main>;
}
