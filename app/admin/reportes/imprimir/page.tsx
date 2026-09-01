import { redirect } from "next/navigation";
import { PrintButton } from "@/features/admin/print-button";
import { getSession } from "@/lib/auth";
import { getBusinessDate, isBusinessDate } from "@/lib/business-date";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PrintableReport({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!["ADMIN", "CASHIER"].includes(session.role)) redirect("/admin");
  const params = await searchParams;
  const from = params.from && isBusinessDate(params.from) ? params.from : getBusinessDate();
  const to = params.to && isBusinessDate(params.to) ? params.to : from;
  const restaurant = await db.restaurant.findUniqueOrThrow({ where: { id: 1 } });
  const orders = await db.customerOrder.findMany({ where: { businessDate: { gte: from, lte: to } }, orderBy: [{ businessDate: "asc" }, { dailyNumber: "asc" }] });
  const events = await db.paymentEvent.findMany({ where: { order: { businessDate: { gte: from, lte: to } } } });
  const income = events.filter((event) => event.type === "PAYMENT").reduce((sum, event) => sum + event.amountCents, 0);
  const refunds = events.filter((event) => event.type === "REFUND").reduce((sum, event) => sum + event.amountCents, 0);
  return <main className="print-report"><header><div><p>Reporte de ventas</p><h1>{restaurant.name}</h1><span>{from} — {to}</span></div><PrintButton /></header><section className="print-report__summary"><div><span>Ingreso bruto</span><strong>{formatPrice(income)}</strong></div><div><span>Reembolsos</span><strong>{formatPrice(refunds)}</strong></div><div><span>Ingreso neto</span><strong>{formatPrice(income - refunds)}</strong></div><div><span>Pedidos</span><strong>{orders.length}</strong></div></section><table><thead><tr><th>Fecha</th><th>Pedido</th><th>Canal</th><th>Estado</th><th>Método</th><th>Total</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td>{order.businessDate}</td><td>#{order.dailyNumber}</td><td>{order.mode}</td><td>{order.status}</td><td>{order.paymentMethod ?? "—"}</td><td>{formatPrice(order.totalCents)}</td></tr>)}</tbody></table><footer>Generado por {session.email} · {new Date().toLocaleString("es-EC", { timeZone: "America/Guayaquil" })}</footer></main>;
}
