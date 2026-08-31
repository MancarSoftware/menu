import type { Metadata } from "next";
import { Archivo_Black, Poppins } from "next/font/google";
import { AppChrome } from "@/components/app-chrome";
import { CartProvider } from "@/features/cart/cart-context";
import "./globals.css";
import "./public.css";

const poppins = Poppins({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600", "700"], display: "swap" });
const archivoBlack = Archivo_Black({ subsets: ["latin"], variable: "--font-poster", weight: "400", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://elbueno.ec"),
  title: { default: "El Bueno — Hamburguesas y pizzas", template: "%s — El Bueno" },
  description: "Hamburguesas, pizzas y combos hechos al momento en Quito, Ecuador.",
  openGraph: { title: "El Bueno", description: "Comida rápida, fresca y hecha al momento en Quito.", type: "website", locale: "es_EC" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-scroll-behavior="smooth" className={`${poppins.variable} ${archivoBlack.variable}`}>
      <body>
        <a className="skip-link" href="#contenido">Saltar al contenido</a>
        <CartProvider><AppChrome>{children}</AppChrome></CartProvider>
      </body>
    </html>
  );
}
