"use client";
import { useEffect, useState } from "react";
import { AdminDashboard } from "@/features/admin/admin-dashboard";
import { paidDelivery, deliveryReceipt } from "@/tests/fixtures/delivery";

export function MobilePreview() {
  const [ready, setReady] = useState(false);
  const [frame, setFrame] = useState(false);
  const [width, setWidth] = useState("390");
  useEffect(() => {
    const framed = new URLSearchParams(window.location.search).has("frame");
    const original = window.fetch;
    window.fetch = async (input) => {
      const url = String(input);
      if (url.includes("/receipt")) return Response.json(deliveryReceipt);
      if (url.includes("/revenue")) return Response.json({ report: { revenueCents: 1574, refundsCents: 0, netRevenueCents: 1574, paymentCount: 1, points: [] } });
      if (url.includes("/metrics")) return Response.json({ metrics: { date: "2026-09-02", revenueCents: 1574, paidOrderCount: 1 } });
      if (url.includes("/reports/orders")) return Response.json({ orders: [paidDelivery, { ...paidDelivery, id: 43, orderNumber: 234, paymentMethod: "TRANSFER", status: "PREPARING", mode: "DINE_IN", table: { id: "table1", number: 12, name: "Mesa de prueba" } }] });
      if (url.includes("/deliveries")) return Response.json({ orders: [], drivers: [], allowedPaymentMethods: [], total: 0, page: 1, pageSize: 20 });
      if (url.includes("/orders")) return Response.json({ orders: [] });
      if (url.includes("/logout")) return Response.json({ error: "Error de conexión de prueba. Inténtalo otra vez." }, { status: 503 });
      return Response.json({ error: "Local fixture only" }, { status: 403 });
    };
    // This temporary, database-free fixture starts on the reported section.
    if (framed) window.sessionStorage.setItem("el-bueno-admin-section-v1", "reports");
    queueMicrotask(() => { setFrame(framed); setReady(true); });
    return () => { window.fetch = original; };
  }, []);
  if (!ready) return null;
  if (!frame) return <main style={{ paddingTop: 90, color: "black" }}><label>Test viewport<select value={width} onChange={(e) => setWidth(e.target.value)}>{["320", "390", "768", "850", "1024", "1440"].map((w) => <option key={w}>{w}</option>)}</select></label><iframe title="Admin responsive preview" src="/admin/qa-mobile?frame=1" style={{ display: "block", width: `${width}px`, height: 1100, border: 0 }} /></main>;
  return <main className="admin-page"><AdminDashboard categories={[]} restaurant={{ id: 1, name: "El Bueno", tagline: "Demo", description: "Demo", address: "Calle demo", city: "Guayaquil", countryCode: "EC", latitude: 0, longitude: 0, phone: "", whatsapp: "", email: "", openingHours: [], socialLinks: {} }} tables={[]} orders={[]} initialMetrics={{ date: "2026-09-02", revenueCents: 1574, paidOrderCount: 1 }} userEmail="demo@example.invalid" role="ADMIN" /></main>;
}
