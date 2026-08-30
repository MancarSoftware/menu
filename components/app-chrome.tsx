"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Home, ImageIcon, Info, Menu as MenuIcon, ShoppingCart } from "lucide-react";
import { useCart } from "@/features/cart/cart-context";
import { BrandMark } from "./brand-mark";

const titles: Record<string, string> = {
  "/": "El Bueno",
  "/menu": "Menú",
  "/carrito": "Carrito de Compras",
  "/contacto": "Contacto",
  "/nosotros": "Sobre Nosotros",
};

const backLinks: Record<string, string> = {
  "/menu": "/",
  "/carrito": "/menu",
  "/contacto": "/",
  "/nosotros": "/",
};

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { count } = useCart();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <><header className="admin-global-header"><Link href="/"><BrandMark /></Link></header>{children}</>;
  }

  const title = titles[pathname] ?? "El Bueno";
  const backHref = backLinks[pathname];

  return (
    <div className="public-app">
      <header className="app-topbar">
        <div className="app-topbar__side">
          {backHref ? <Link href={backHref} aria-label="Volver"><ArrowLeft aria-hidden="true" /></Link> : <BrandMark compact />}
        </div>
        <strong>{title}</strong>
        <Link className="cart-link" href="/carrito" aria-label={`Carrito, ${count} ${count === 1 ? "producto" : "productos"}`}>
          <ShoppingCart aria-hidden="true" />
          {count > 0 && <span>{count > 99 ? "99+" : count}</span>}
        </Link>
      </header>
      {children}
      <nav className="app-bottom-nav" aria-label="Navegación principal">
        <Link href="/" aria-current={pathname === "/" ? "page" : undefined}><Home aria-hidden="true" /><span>Inicio</span></Link>
        <Link href="/menu" aria-current={pathname === "/menu" ? "page" : undefined}><MenuIcon aria-hidden="true" /><span>Menú</span></Link>
        <Link href="/contacto" aria-current={pathname === "/contacto" ? "page" : undefined}><ImageIcon aria-hidden="true" /><span>Contacto</span></Link>
        <Link href="/nosotros" aria-current={pathname === "/nosotros" ? "page" : undefined}><Info aria-hidden="true" /><span>Nosotros</span></Link>
      </nav>
    </div>
  );
}
