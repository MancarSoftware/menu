import type { Metadata } from "next";
import { AdminDashboard } from "@/features/admin/admin-dashboard";
import { requireAdminPage } from "@/lib/auth";
import { getActiveOrders, getAdminMenu, getAdminMetrics, getDiningTables, getRestaurant } from "@/lib/menu-repository";

export const metadata: Metadata = { title: "Administración", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdminPage();
  const [categories, restaurant, tables, orders, metrics] = await Promise.all([getAdminMenu(), getRestaurant(), getDiningTables(), getActiveOrders(), getAdminMetrics()]);
  return <main id="contenido" className="admin-page"><AdminDashboard categories={categories} restaurant={restaurant} tables={tables} orders={orders} initialMetrics={metrics} userEmail={session.email} /></main>;
}
