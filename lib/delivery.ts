import type { OrderView, PaymentMethod, StaffRole } from "./domain";

type DeliveryRecord = { mode: string; status: string; deliveryStatus: string; assignedDriverId: string | null };
type DeliveryActor = { id: string; role: StaffRole; canCollectCash: boolean; canCollectCard?: boolean; canCollectTransfer?: boolean };

export function deliveryActionError(order: DeliveryRecord, actor: DeliveryActor, action: "ASSIGN" | "DISPATCH" | "DELIVER" | "REPORT_ISSUE" | "RETRY", intervention?: { override?: boolean; overrideReason?: string }) {
  if (order.mode !== "DELIVERY" || ["CANCELLED", "PAID"].includes(order.status)) return "Este pedido no admite cambios de reparto.";
  const manager = ["ADMIN", "CASHIER"].includes(actor.role);
  if (!manager && (actor.role !== "DRIVER" || order.assignedDriverId !== actor.id)) return "Este pedido no está asignado a tu cuenta.";
  const driverAction = ["DISPATCH", "DELIVER", "REPORT_ISSUE"].includes(action);
  if (intervention?.override && (actor.role !== "ADMIN" || !driverAction)) return "Solo administración puede intervenir en una acción de reparto.";
  if (manager && driverAction && (actor.role !== "ADMIN" || !intervention?.override || !intervention.overrideReason?.trim() || intervention.overrideReason.trim().length < 4)) return "Esta acción corresponde al repartidor. Administración debe usar una intervención con motivo.";
  if (action === "REPORT_ISSUE") return order.status === "READY" && order.deliveryStatus === "OUT_FOR_DELIVERY" ? null : "Solo puedes reportar una incidencia de un reparto en camino.";
  if (action === "RETRY") return manager && order.status === "READY" && order.deliveryStatus === "FAILED" ? null : "Caja debe autorizar el reintento de una entrega con incidencia.";
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

export function confirmedDeliveryPoint(order: Pick<OrderView, "deliveryLatitude" | "deliveryLongitude">) {
  const { deliveryLatitude: lat, deliveryLongitude: lng } = order;
  const validPoint = typeof lat === "number" && Number.isFinite(lat) && Math.abs(lat) <= 90 && typeof lng === "number" && Number.isFinite(lng) && Math.abs(lng) <= 180;
  return validPoint ? { latitude: lat, longitude: lng } : null;
}

export function deliveryDirectionsUrl(order: Pick<OrderView, "deliveryLatitude" | "deliveryLongitude" | "deliveryAddress">) {
  const point = confirmedDeliveryPoint(order);
  const destination = point ? `${point.latitude},${point.longitude}` : order.deliveryAddress?.trim();
  return destination ? `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination, travelmode: "driving" })}` : null;
}

export function deliveryStatusLabel(status: string) {
  return status === "FAILED" ? "Incidencia de entrega" : status === "OUT_FOR_DELIVERY" ? "En camino" : status === "DELIVERED" ? "Entregado" : "Por despachar";
}
