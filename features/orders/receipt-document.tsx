import type { OrderView } from "@/lib/domain";
import { formatPrice } from "@/lib/format";
import { paymentMethodLabels, staffDisplayName } from "@/lib/payment-labels";

export type ReceiptView = {
  restaurant: { name: string; address: string; city: string; phone: string };
  order: OrderView;
  driverName: string | null;
  paymentEvents: { id: string; type: string; method: string; amountCents: number; reason: string; actorName: string; createdAt: string }[];
};
const dateTime = (date: string) => new Date(date).toLocaleString("es-EC", { timeZone: "America/Guayaquil", dateStyle: "short", timeStyle: "short" });

export function ReceiptDocument({ receipt }: { receipt: ReceiptView }) {
  const { order, restaurant } = receipt;
  const paid = receipt.paymentEvents.reduce((sum, event) => sum + (event.type === "PAYMENT" ? event.amountCents : event.type === "REFUND" ? -event.amountCents : 0), 0);
  return <article className="receipt-document">
    <header className="receipt-document__brand"><span className="receipt-document__mark" aria-hidden="true">EB</span><div><h1>{restaurant.name}</h1><p>{restaurant.address} · {restaurant.city}</p><p>Tel. {restaurant.phone}</p></div></header>
    <section className="receipt-document__heading"><div><p>COMPROBANTE DE PEDIDO</p><h2>#{order.orderNumber.toString().padStart(3, "0")}</h2></div><div><strong>{order.mode === "DELIVERY" ? "A domicilio" : order.mode === "PICKUP" ? "Retiro en el local" : `Mesa ${order.table?.number}`}</strong><p>{dateTime(order.createdAt)}</p><span>{order.paymentStatus === "PAID" ? "PAGADO" : order.paymentStatus === "REFUNDED" ? "REEMBOLSADO" : order.paymentStatus === "PARTIALLY_REFUNDED" ? "REEMBOLSO PARCIAL" : "PAGO PENDIENTE"}</span></div></section>
    <dl className="receipt-document__details">{order.customerName && <div><dt>Cliente</dt><dd>{order.customerName}</dd></div>}{order.deliveryAddress && <div><dt>Referencia de entrega</dt><dd>{order.deliveryAddress}</dd></div>}{receipt.driverName && <div><dt>Repartidor</dt><dd>{staffDisplayName(receipt.driverName)}</dd></div>}<div><dt>Fecha del pedido</dt><dd>{order.businessDate}</dd></div></dl>
    <table className="receipt-document__items"><thead><tr><th>Cant.</th><th>Detalle</th><th>Unitario</th><th>Importe</th></tr></thead><tbody>{order.items.map((item) => <tr key={item.id}><td>{item.quantity}</td><td><strong>{item.productName}</strong>{item.customization.length > 0 && <small>{item.customization.join(" · ")}</small>}</td><td>{formatPrice(item.unitPriceCents)}</td><td>{formatPrice(item.lineTotalCents)}</td></tr>)}</tbody></table>
    <section className="receipt-document__totals"><p><span>Subtotal</span><strong>{formatPrice(order.subtotalCents)}</strong></p>{order.totalCents !== order.subtotalCents && <p><span>Entrega</span><strong>{formatPrice(order.totalCents - order.subtotalCents)}</strong></p>}<p className="receipt-document__grand-total"><span>Total USD</span><strong>{formatPrice(order.totalCents)}</strong></p><p><span>Cobrado neto</span><strong>{formatPrice(paid)}</strong></p></section>
    <section className="receipt-document__payments"><h3>Pagos y correcciones</h3>{receipt.paymentEvents.length ? receipt.paymentEvents.map((event) => <div key={event.id}><p><strong>{event.type === "PAYMENT" ? "Cobro" : "Reembolso"} · {paymentMethodLabels[event.method as keyof typeof paymentMethodLabels] ?? event.method}</strong><b>{formatPrice(event.amountCents)}</b></p><small>{dateTime(event.createdAt)} · {staffDisplayName(event.actorName)}</small>{event.reason && <p>{event.reason}</p>}</div>) : <p>Aún no se ha registrado un cobro.</p>}</section>
    {order.notes && <p className="receipt-document__notes"><strong>Observaciones: </strong>{order.notes}</p>}
    <footer><strong>¡Gracias por tu pedido!</strong><p>Comprobante informativo del pedido. No es una factura tributaria.</p></footer>
  </article>;
}
