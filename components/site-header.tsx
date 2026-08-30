"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { BrandMark } from "./brand-mark";

const links = [
  { href: "/", label: "La casa" },
  { href: "/menu", label: "Carta" },
  { href: "/#visitanos", label: "Visítanos" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <header className="site-header" data-context={isAdmin ? "admin" : "public"}>
      <Link href="/" className="site-header__brand">
        <BrandMark />
      </Link>
      {!isAdmin && <nav className="site-header__desktop" aria-label="Navegación principal">
        {links.map((link) => (
          <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined}>
            {link.label}
          </Link>
        ))}
      </nav>}
      {!isAdmin && <a className="site-header__reserve" aria-label="Reservar una mesa por WhatsApp" href="https://wa.me/593999123456?text=Hola%2C%20quisiera%20reservar%20una%20mesa" target="_blank" rel="noreferrer">
        <span>Reservar mesa</span><ArrowUpRight aria-hidden="true" />
      </a>}
    </header>
  );
}
