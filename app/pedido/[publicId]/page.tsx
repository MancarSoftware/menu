import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OrderStatusView } from "@/features/orders/order-status";
import { db } from "@/lib/db";
import { orderInclude, toOrderView } from "@/lib/order-serializers";
import { getDiningTableSession } from "@/lib/table-session";

export const metadata: Metadata = { title: "Estado del pedido", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ publicId: string }> }) {
  const table = await getDiningTableSession();
  if (!table) redirect("/menu");
  const { publicId } = await params;
  const order = await db.customerOrder.findFirst({ where: { publicId, diningTableId: table.id }, include: orderInclude });
  if (!order) notFound();
  return <OrderStatusView initialOrder={toOrderView(order)} />;
}
