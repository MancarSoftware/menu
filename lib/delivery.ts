import type { OrderView, PaymentMethod, StaffRole } from "./domain";

type DeliveryRecord = { mode: string; status: string; deliveryStatus: string; assignedDriverId: string | null };
type DeliveryActor = { id: string; role: StaffRole; canCollectCash: boolean; canCollectCard?: boolean; canCollectTransfer?: boolean };

export function deliveryActionError(order: DeliveryRecord, actor: DeliveryActor, action: "ASSIGN" | "DISPATCH" | "DELIVER") {
  if (order.mode !== "DELIVERY" || ["CANCELLED", "PAID"].includes(order.status)) return "Este pedido no admite cambios de reparto.";
  const manager = ["ADMIN", "CASHIER"].includes(actor.role);
  if (!manager && (actor.role !== "DRIVER" || order.assignedDriverId !== actor.id)) return "Este pedido no está asignado a tu cuenta.";
  if (action === "ASSIGN") {
    if (!manager) return "Solo caja o administración puede asignar repartidores.";
    if (order.deliveryStatus === "DELIVERED") return "El pedido ya fue entregado.";
  } else {
    if (!order.assignedDriverId) return "Asigna un repartidor primero.";
    if (order.status !== "READY") return "La cocina debe marcar el pedido como listo.";
    if (action === "DISPATCH" && order.deliveryStatus !== "PENDING") return "El pedido ya salió a reparto.";
    if (action === "DELIVER" && order.deliveryStatus !== "OUT_FOR_DELIVERY") return "Marca la salida a reparto antes de entregar.";
  }
  return null;
}

export function driverPaymentMethods(actor: Pick<DeliveryActor, "canCollectCash" | "canCollectCard" | "canCollectTransfer">): PaymentMethod[] {
  return (["CASH", "CARD", "TRANSFER"] as const).filter((method) => method === "CASH" ? actor.canCollectCash : method === "CARD" ? actor.canCollectCard : actor.canCollectTransfer);
}

export function canDriverCollectPayment(order: DeliveryRecord, actor: DeliveryActor, method?: string) {
  return actor.role === "DRIVER" && driverPaymentMethods(actor).includes(method as PaymentMethod) && order.mode === "DELIVERY" && order.assignedDriverId === actor.id && order.deliveryStatus === "DELIVERED" && order.status === "SERVED";
}

export function deliveryDirectionsUrl(order: Pick<OrderView, "deliveryLatitude" | "deliveryLongitude" | "deliveryAddress">) {
  const { deliveryLatitude: lat, deliveryLongitude: lng } = order;
  const validPoint = typeof lat === "number" && Number.isFinite(lat) && Math.abs(lat) <= 90 && typeof lng === "number" && Number.isFinite(lng) && Math.abs(lng) <= 180;
  const destination = validPoint ? `${lat},${lng}` : order.deliveryAddress?.trim();
  return destination ? `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination, travelmode: "driving" })}` : null;
}

export function deliveryStatusLabel(status: string) {
  return status === "OUT_FOR_DELIVERY" ? "En camino" : status === "DELIVERED" ? "Entregado" : "Por despachar";
}
