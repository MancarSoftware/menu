import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, MapPin } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { getFeaturedItems, getRestaurant } from "@/lib/menu-repository";

export const revalidate = 60;

export default async function HomePage() {
  const [restaurant, featured] = await Promise.all([getRestaurant(), getFeaturedItems()]);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FastFoodRestaurant",
    name: restaurant.name,
    description: restaurant.description,
    address: { "@type": "PostalAddress", streetAddress: restaurant.address, addressLocality: "Santiago de los Caballeros", addressCountry: "DO" },
    telephone: restaurant.phone,
    email: restaurant.email,
    servesCuisine: ["Hamburguesas", "Pizza", "Comida rápida"],
    priceRange: "RD$",
  };

  return (
    <main id="contenido" className="fast-page home-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <div className="flavor-ticker" aria-hidden="true">
        <span>BURGERS · PIZZA · COMBOS · HECHO AL MOMENTO ·</span>
        <span>BURGERS · PIZZA · COMBOS · HECHO AL MOMENTO ·</span>
      </div>
      <section className="fast-hero" aria-labelledby="welcome-title">
        <Image src="/images/fast-food/hero.webp" alt="Hamburguesas con vegetales frescos y aros de cebolla" fill priority unoptimized sizes="(max-width: 760px) 100vw, 1120px" />
        <div className="fast-hero__overlay">
          <p>Santiago · abierto todos los días</p>
          <h1 id="welcome-title">Hambre en serio.<br /><em>Sabor sin vueltas.</em></h1>
          <Link href="/menu">Ver el menú <ArrowRight aria-hidden="true" /></Link>
        </div>
        <div className="hero-price"><small>BURGERS</small><strong>DESDE</strong><b>RD$350</b></div>
        <p className="hero-side-note">CALIENTE · RÁPIDO · BUENO</p>
      </section>

      <section className="welcome-copy">
        <span className="section-number">01</span>
        <div><p className="section-kicker">Hecho al momento</p><h2>No es comida de paso.<br />Es comida para volver.</h2></div>
        <div className="welcome-copy__body"><p>{restaurant.description} Hamburguesas jugosas, pizzas doradas y combos listos para compartir.</p><div className="quick-facts"><span><Clock3 aria-hidden="true" /> Servicio rápido</span><span><MapPin aria-hidden="true" /> Santiago</span></div></div>
      </section>

      {featured.length > 0 && <section className="popular-section" aria-labelledby="popular-title">
        <header><div><p className="section-kicker">Los que mandan</p><h2 id="popular-title">Tus próximos favoritos.</h2></div><Link href="/menu">Ver todo el menú <ArrowRight aria-hidden="true" /></Link></header>
        <div className="popular-grid">
          {featured.slice(0, 4).map((item, index) => <Link href={`/menu?plato=${item.slug}#${item.categorySlug}`} className="popular-item" key={item.id}>
            <span className="popular-item__image"><Image src={item.imageUrl} alt="" fill sizes="(max-width: 760px) 120px, 260px" /></span>
            <span><small>0{index + 1} · {item.categoryName}</small><strong>{item.name}</strong><p>{item.shortDescription}</p></span>
            <b>{formatPrice(item.priceCents)}</b>
          </Link>)}
        </div>
      </section>}

      <section className="find-us" aria-labelledby="find-us-title">
        <header><div><p className="section-kicker">Ven con hambre</p><h2 id="find-us-title">Aquí empieza<br />lo bueno.</h2></div><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`} target="_blank" rel="noreferrer">Cómo llegar <ArrowRight aria-hidden="true" /></a></header>
        <div className="find-us__map"><Image src="/images/fast-food/map.webp" alt="Mapa de Santiago de los Caballeros" fill sizes="(max-width: 760px) 100vw, 1120px" /></div>
        <div className="find-us__address"><MapPin aria-hidden="true" /><p><span>Nuestro local</span>{restaurant.address}</p><strong>TE ESPERAMOS</strong></div>
      </section>
    </main>
  );
}
