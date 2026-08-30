import Link from "next/link";
import type { RestaurantView } from "@/lib/domain";
import { BrandMark } from "./brand-mark";

export function SiteFooter({ restaurant }: { restaurant: RestaurantView }) {
  return (
    <footer className="site-footer">
      <div className="site-footer__lead">
        <BrandMark />
        <p>{restaurant.tagline}</p>
      </div>
      <div className="site-footer__nav">
        <p className="eyebrow">Explora</p>
        <Link href="/menu">Carta completa</Link>
        <Link href="/#visitanos">Ubicación y horarios</Link>
        <Link href="/admin/login">Administración</Link>
      </div>
      <div className="site-footer__contact">
        <p className="eyebrow">Mesa</p>
        <a href={`mailto:${restaurant.email}`}>{restaurant.email}</a>
        <a href={`tel:${restaurant.phone.replace(/\s/g, "")}`}>{restaurant.phone}</a>
      </div>
      <p className="site-footer__legal">© {new Date().getFullYear()} {restaurant.name}. Cocina y territorio.</p>
    </footer>
  );
}
