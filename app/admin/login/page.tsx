import { redirect } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "@/features/admin/login-form";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  if (await getSession()) redirect("/admin");
  return (
    <main id="contenido" className="login-page">
      <section className="login-page__story"><BrandMark /><p className="eyebrow">Administración privada</p><h1>La carta cambia.<br /><em>La identidad permanece.</em></h1><p>Gestiona platos, disponibilidad, precios y la información de la casa desde un solo lugar.</p></section>
      <section className="login-page__panel"><p className="section-index">Acceso / 01</p><h2>Bienvenido<br />de vuelta.</h2><LoginForm /><Link href="/">← Volver al sitio público</Link></section>
    </main>
  );
}
