import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "@/features/admin/login-form";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Acceso del equipo", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await getSession()) redirect("/admin");
  return (
    <main id="contenido" className="login-page">
      <section className="login-page__story"><BrandMark /><p className="eyebrow">Acceso del equipo</p><h1>Tu equipo,<br /><em>en un solo lugar.</em></h1><p>Ingresa con tu cuenta para acceder a las herramientas de tu rol en el restaurante.</p></section>
      <section className="login-page__panel"><p className="section-index">Acceso / 01</p><h2>Bienvenido<br />de vuelta.</h2><LoginForm /><Link href="/">← Volver al sitio público</Link></section>
    </main>
  );
}
