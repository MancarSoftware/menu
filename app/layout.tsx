import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";
import "./public.css";

const display = Cormorant_Garamond({ subsets: ["latin"], variable: "--font-display", weight: ["400", "500", "600"], display: "swap" });
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://brasanorte.ec"),
  title: { default: "Brasa Norte — Cocina de altura", template: "%s — Brasa Norte" },
  description: "Cocina ecuatoriana contemporánea en La Floresta, Quito. Fuego, producto de altura y memoria.",
  openGraph: { title: "Brasa Norte", description: "Cocina de altura, fuego de origen.", type: "website", locale: "es_EC" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-scroll-behavior="smooth" className={`${display.variable} ${sans.variable}`}>
      <body>
        <a className="skip-link" href="#contenido">Saltar al contenido</a>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
