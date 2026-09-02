import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getOrderReceipt } from "@/lib/order-receipt";
import { ReceiptDocument } from "@/features/orders/receipt-document";
import { PrintButton } from "@/features/admin/print-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comprobante de pedido", robots: { index: false, follow: false } };

export default async function PrintableReceipt({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  const receipt = await getOrderReceipt(Number((await params).id), session);
  if (!receipt) notFound();
  return <main id="contenido" className="receipt-print-page"><div className="receipt-print-tools"><a href="/admin">Volver al panel</a><PrintButton /><p>En las opciones de impresión, desactiva «Encabezados y pies de página» para ocultar la URL del navegador.</p></div><ReceiptDocument receipt={receipt} /></main>;
}
