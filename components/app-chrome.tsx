"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Clock3, Home, ImageIcon, Info, Menu as MenuIcon, ShoppingCart, X } from "lucide-react";
import { useEffect } from "react";
import { activeOrderStatusLabel, useCart } from "@/features/cart/cart-context";
import type { OrderView } from "@/lib/domain";
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
  const router = useRouter();
  const { activeOrders, count, forgetOrder, rememberOrder } = useCart();
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    if (!activeOrders.length || isAdmin) return;
    let cancelled = false;

    async function reconcileOrders() {
      for (const storedOrder of activeOrders) {
        if (cancelled) return;
        const isCurrentOrderPage = pathname === `/pedido/${storedOrder.publicId}`;
        if (isCurrentOrderPage) continue;

        if (storedOrder.status === "CANCELLED" || (storedOrder.status === "PAID" && storedOrder.mode !== "DINE_IN")) continue;
        try {
          const endpoint = storedOrder.mode === "DINE_IN" ? `/api/dine-in/orders/${storedOrder.publicId}` : `/api/orders/${storedOrder.publicId}`;
          const response = await fetch(endpoint, { cache: "no-store" });
          const body = await response.json() as { order?: OrderView };
          if (cancelled) return;
          if (response.ok && body.order) {
            const latest = body.order;
            // Only the server-confirmed order for the current table may end its session.
            if (latest.mode === "DINE_IN" && latest.status === "PAID") {
              const ended = await fetch("/api/dine-in/session", { method: "DELETE" });
              if (cancelled) return;
              if (ended.ok) {
                activeOrders.filter((order) => order.mode === "DINE_IN" && order.tableNumber === latest.table?.number).forEach((order) => forgetOrder(order.publicId));
                router.refresh();
                return;
              }
            }
            rememberOrder(latest);
          }
          else if ([401, 404].includes(response.status)) forgetOrder(storedOrder.publicId);
        } catch {
          // Keep the last known state visible until connectivity returns.
        }
      }
    }

    void reconcileOrders();
    const interval = window.setInterval(reconcileOrders, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeOrders, forgetOrder, isAdmin, pathname, rememberOrder, router]);

  if (isAdmin) {
    return <><header className="admin-global-header"><Link href="/"><BrandMark /></Link></header>{children}</>;
  }

  const title = titles[pathname] ?? "El Bueno";
  const backHref = backLinks[pathname];
  const visibleOrders = activeOrders.filter((order) => pathname !== `/pedido/${order.publicId}`);

  return (
    <div className="public-app" data-has-orders={visibleOrders.length > 0}>
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
      {visibleOrders.length > 0 && <section className="active-orders-strip" aria-label="Pedidos en curso">
        <span className="active-orders-strip__label"><Clock3 aria-hidden="true" />{visibleOrders.length === 1 ? "Tu pedido" : "Tus pedidos"}</span>
        <div>
          {visibleOrders.map((order) => {
            const final = ["PAID", "CANCELLED"].includes(order.status);
            return <article key={order.publicId} data-status={order.status}>
              <Link href={`/pedido/${order.publicId}`}>
                <span><strong>#{order.orderNumber}</strong><small>{order.mode === "DINE_IN" && order.tableNumber ? `Mesa ${order.tableNumber} · ` : ""}{activeOrderStatusLabel(order.status, order.mode, order.deliveryStatus)}</small></span>
                <ChevronRight aria-hidden="true" />
              </Link>
              {final && <button type="button" onClick={() => forgetOrder(order.publicId)} aria-label={`Ocultar pedido ${order.orderNumber}`}><X aria-hidden="true" /></button>}
            </article>;
          })}
        </div>
      </section>}
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
