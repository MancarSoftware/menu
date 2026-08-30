import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { AppChrome } from "@/components/app-chrome";
import { CartProvider } from "@/features/cart/cart-context";
import "./globals.css";
import "./public.css";

const poppins = Poppins({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600", "700"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://elbueno.do"),
  title: { default: "El Bueno — Hamburguesas y pizzas", template: "%s — El Bueno" },
  description: "Hamburguesas, pizzas y combos hechos al momento en Santiago.",
  openGraph: { title: "El Bueno", description: "Comida rápida, fresca y hecha al momento.", type: "website", locale: "es_DO" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-scroll-behavior="smooth" className={poppins.variable}>
      <body>
        <a className="skip-link" href="#contenido">Saltar al contenido</a>
        <CartProvider><AppChrome>{children}</AppChrome></CartProvider>
      </body>
    </html>
  );
}
