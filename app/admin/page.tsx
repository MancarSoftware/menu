import type { Metadata } from "next";
import { AdminDashboard } from "@/features/admin/admin-dashboard";
import { DriverDashboard } from "@/features/admin/driver-dashboard";
import { requireAdminPage } from "@/lib/auth";
import { getActiveOrders, getAdminMenu, getAdminMetrics, getDiningTables, getRestaurant } from "@/lib/menu-repository";
import { getBusinessDate } from "@/lib/business-date";

export const metadata: Metadata = { title: "Administración", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdminPage();
  if (session.role === "DRIVER") return <main id="contenido" className="admin-page"><DriverDashboard /></main>;
  const [categories, restaurant, tables, orders, metrics] = await Promise.all([getAdminMenu(), getRestaurant(), getDiningTables(), getActiveOrders(), ["ADMIN", "CASHIER"].includes(session.role) ? getAdminMetrics() : Promise.resolve({ date: getBusinessDate(), revenueCents: 0, paidOrderCount: 0 })]);
  return <main id="contenido" className="admin-page"><AdminDashboard categories={categories} restaurant={restaurant} tables={tables} orders={orders} initialMetrics={metrics} userEmail={session.email} role={session.role} /></main>;
}
