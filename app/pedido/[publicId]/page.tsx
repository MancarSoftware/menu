import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OrderStatusView } from "@/features/orders/order-status";
import { db } from "@/lib/db";
import { orderInclude, toOrderView } from "@/lib/order-serializers";
import { getDiningTableSession } from "@/lib/table-session";

export const metadata: Metadata = { title: "Estado del pedido", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const order = await db.customerOrder.findUnique({ where: { publicId }, include: orderInclude });
  if (!order) notFound();
  if (order.mode === "DINE_IN") {
    const table = await getDiningTableSession();
    if (!table || order.diningTableId !== table.id) redirect("/menu");
  }
  return <OrderStatusView initialOrder={toOrderView(order)} />;
}
