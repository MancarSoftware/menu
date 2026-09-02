import type { DeliveryOrderView } from "@/lib/domain";
import type { ReceiptView } from "@/features/orders/receipt-document";

export const deliveredOrder: DeliveryOrderView = {
  id: 42, publicId: "demo-order-42", orderNumber: 1, businessDate: "2026-09-01", mode: "DELIVERY",
  status: "SERVED", paymentStatus: "PENDING", paymentMethod: null, subtotalCents: 2648, totalCents: 2898,
  notes: "Tocar el timbre al llegar.", customerName: "Cliente de prueba", customerPhone: "0990000000",
  deliveryAddress: "Av. de prueba, casa 12", deliveryLatitude: -2.17, deliveryLongitude: -79.92,
  deliveryStatus: "DELIVERED", deliveredAt: "2026-09-02T05:05:00.000Z", acknowledgedAt: "2026-09-01T23:50:00.000Z", version: 4,
  createdAt: "2026-09-02T04:50:00.000Z", table: null, assignedDriver: { id: "driver1", name: "Ana Repartidora" },
  items: [{ id: "item42", productName: "Hamburguesa Doble", quantity: 2, unitPriceCents: 1324, lineTotalCents: 2648, customization: ["Doble carne", "Queso extra", "Sin pepinillos"] }],
};
export const paidDelivery: DeliveryOrderView = { ...deliveredOrder, status: "PAID", paymentStatus: "PAID", paymentMethod: "CASH", version: 5 };
export const deliveryReceipt: ReceiptView = {
  restaurant: { name: "El Bueno", address: "Avenida de prueba 123", city: "Guayaquil", phone: "0990000000" },
  order: paidDelivery, driverName: "Ana Repartidora",
  paymentEvents: [{ id: "payment1", type: "PAYMENT", method: "CASH", amountCents: 2898, reason: "", actorName: "Ana Repartidora", createdAt: "2026-09-02T05:10:00.000Z" }],
};
