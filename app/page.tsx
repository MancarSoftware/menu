import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Clock3, MapPin } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { formatPrice } from "@/lib/format";
import { getFeaturedItems, getRestaurant } from "@/lib/menu-repository";

export const revalidate = 60;

export default async function HomePage() {
  const [restaurant, featured] = await Promise.all([getRestaurant(), getFeaturedItems()]);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurant.name,
    description: restaurant.description,
    address: { "@type": "PostalAddress", streetAddress: restaurant.address, addressLocality: "Quito", addressCountry: "EC" },
    telephone: restaurant.phone,
    email: restaurant.email,
    servesCuisine: "Ecuatoriana contemporánea",
    priceRange: "$$$",
  };

  return (
    <main id="contenido">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <section className="home-hero" aria-labelledby="hero-title">
        <div className="home-hero__copy">
          <p className="eyebrow">Quito · Cocina ecuatoriana contemporánea</p>
          <h1 id="hero-title">Fuego de origen.<br /><em>Sabor de altura.</em></h1>
          <p>{restaurant.description}</p>
          <div className="home-hero__actions">
            <Link className="button button--solid" href="/menu">Explorar la carta <ArrowRight aria-hidden="true" /></Link>
            <a className="text-link" href={`https://wa.me/${restaurant.whatsapp}?text=Hola%2C%20quisiera%20reservar%20una%20mesa`} target="_blank" rel="noreferrer">Reservar una mesa <ArrowUpRight aria-hidden="true" /></a>
          </div>
        </div>
        <div className="home-hero__visual">
          <Image src="/images/hero-pulpo.webp" alt="Pulpo a la brasa con mellocos y choclo" fill priority sizes="(max-width: 800px) 100vw, 52vw" />
          <span>Carta 01 / 2026</span>
        </div>
      </section>

      {featured.length > 0 && <section className="home-selection" aria-labelledby="featured-title">
        <header>
          <div><p className="eyebrow">Selección de la casa</p><h2 id="featured-title">Empieza por aquí.</h2></div>
          <Link className="text-link" href="/menu">Ver carta completa <ArrowRight aria-hidden="true" /></Link>
        </header>
        <div className="home-selection__grid">
          {featured.slice(0, 4).map((item) => <Link href={`/menu?plato=${item.slug}#${item.categorySlug}`} key={item.id} className="home-dish">
            <span className="home-dish__image"><Image src={item.imageUrl} alt="" fill sizes="(max-width: 760px) 38vw, 18vw" /></span>
            <span className="home-dish__copy"><small>{item.categoryName}</small><strong>{item.name}</strong><span>{item.shortDescription}</span></span>
            <b>{formatPrice(item.priceCents)}</b>
          </Link>)}
        </div>
      </section>}

      <section id="visitanos" className="visit section-shell" aria-labelledby="visit-title">
        <div className="visit__title"><p className="eyebrow">La mesa</p><h2 id="visit-title">Nos vemos<br /><em>esta noche.</em></h2></div>
        <div className="visit__details">
          <div><MapPin aria-hidden="true" /><p>{restaurant.address}</p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`} target="_blank" rel="noreferrer">Abrir en mapas <ArrowUpRight aria-hidden="true" /></a></div>
          <div><Clock3 aria-hidden="true" /><span>{restaurant.openingHours.map((entry) => <p key={entry.days}><strong>{entry.days}</strong>{entry.hours}</p>)}</span></div>
        </div>
      </section>

      <SiteFooter restaurant={restaurant} />
    </main>
  );
}
