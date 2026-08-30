import type { Metadata } from "next";
import { AdminDashboard } from "@/features/admin/admin-dashboard";
import { requireAdminPage } from "@/lib/auth";
import { getAdminMenu, getRestaurant } from "@/lib/menu-repository";

export const metadata: Metadata = { title: "Administración", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdminPage();
  const [categories, restaurant] = await Promise.all([getAdminMenu(), getRestaurant()]);
  return <main id="contenido" className="admin-page"><AdminDashboard categories={categories} restaurant={restaurant} userEmail={session.email} /></main>;
}
