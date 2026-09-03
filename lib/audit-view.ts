import { formatPrice } from "./format";
import { paymentMethodLabels, staffDisplayName } from "./payment-labels";

export const auditActions: Record<string, string> = {
  AUTH_LOGIN: "Inicio de sesión", PASSWORD_CHANGED: "Cambio de contraseña", STAFF_PASSWORD_RESET: "Restablecimiento de acceso",
  STAFF_CREATED: "Nuevo miembro del equipo", STAFF_UPDATED: "Cambio de acceso o permisos",
  DELIVERY_ASSIGN: "Asignación de reparto", DELIVERY_DISPATCH: "Salida a reparto", DELIVERY_DELIVER: "Entrega confirmada",
  DELIVERY_REPORT_ISSUE: "Incidencia de entrega", DELIVERY_RETRY: "Reintento autorizado",
  ORDER_STATUS_CHANGED: "Cambio de estado", ORDER_PAYMENT_RECORDED: "Cobro registrado",
  DRIVER_CASH_RECEIVED: "Efectivo recibido en caja", PAYMENT_REFUNDED: "Reembolso", PAYMENT_METHOD_CORRECTED: "Corrección del medio de pago",
  CASH_SHIFT_OPENED: "Apertura de caja", CASH_SHIFT_CLOSED: "Cierre de caja", DEMO_DATA_RESET: "Reinicio de demo",
};
const verbs: Record<string, string> = {
  AUTH_LOGIN: "inició sesión", PASSWORD_CHANGED: "cambió su contraseña", STAFF_PASSWORD_RESET: "restableció un acceso",
  STAFF_CREATED: "creó un acceso", STAFF_UPDATED: "actualizó un acceso o sus permisos",
  DELIVERY_ASSIGN: "asignó el reparto", DELIVERY_DISPATCH: "confirmó la salida a reparto", DELIVERY_DELIVER: "confirmó la entrega",
  DELIVERY_REPORT_ISSUE: "registró una incidencia", DELIVERY_RETRY: "autorizó otro intento de entrega",
  ORDER_STATUS_CHANGED: "actualizó el pedido", ORDER_PAYMENT_RECORDED: "registró un cobro",
  DRIVER_CASH_RECEIVED: "recibió efectivo del repartidor", PAYMENT_REFUNDED: "registró un reembolso", PAYMENT_METHOD_CORRECTED: "corrigió el medio de pago",
  CASH_SHIFT_OPENED: "abrió caja", CASH_SHIFT_CLOSED: "cerró caja", DEMO_DATA_RESET: "reinició la demo de staging",
};
const states: Record<string, string> = { RECEIVED: "Recibido", PREPARING: "En cocina", READY: "Listo", SERVED: "Entregado", PAID: "Pagado", CANCELLED: "Cancelado", PENDING: "Por despachar", OUT_FOR_DELIVERY: "En camino", DELIVERED: "Entregado", FAILED: "Con incidencia" };
export type AuditOrder = { id: number; orderNumber: number; businessDate: string };
export type AuditEntryView = { id: string; action: string; title: string; summary: string; actorName: string; createdAt: string; order: AuditOrder | null; subject: string; intervention: boolean; details: { label: string; value: string }[] };
export type AuditFeed = { entries: AuditEntryView[]; total: number; page: number; pageSize: number; totalPages: number };
export function auditDetails(value: string): Record<string, unknown> {
  try { const parsed: unknown = JSON.parse(value); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}; } catch { return {}; }
}
type AuditRecord = { id: string; action: string; actorName: string; createdAt: Date; entityType: string; details: string };
export function toAuditEntry(entry: AuditRecord, context: { actorName?: string; driverName?: string; subjectName?: string; order?: AuditOrder | null; amountCents?: number }): AuditEntryView {
  const data = auditDetails(entry.details);
  const actorName = staffDisplayName(entry.actorName.includes("@") ? context.actorName : entry.actorName);
  const order = context.order ?? null;
  const amount = typeof data.amountCents === "number" && Number.isSafeInteger(data.amountCents) ? data.amountCents : context.amountCents;
  const detail: AuditEntryView["details"] = [];
  for (const [field, label] of [["reason", "Motivo"], ["overrideReason", "Motivo de intervención"]] as const) {
    if (typeof data[field] === "string") detail.push({ label, value: data[field].slice(0, 240) });
  }
  if (amount !== undefined) detail.push({ label: "Importe", value: formatPrice(amount) });
  for (const [field, label] of [["openingBalanceCents", "Fondo inicial"], ["expectedCashCents", "Efectivo esperado"], ["actualCashCents", "Efectivo contado"], ["discrepancyCents", "Diferencia"]] as const) {
    if (typeof data[field] === "number" && Number.isSafeInteger(data[field])) detail.push({ label, value: formatPrice(data[field]) });
  }
  for (const [field, label] of [["from", "Antes"], ["to", "Después"], ["paymentMethod", "Medio de pago"]] as const) {
    const value = data[field];
    if (typeof value === "string") {
      const display = states[value] ?? paymentMethodLabels[value as keyof typeof paymentMethodLabels];
      if (display) detail.push({ label, value: display });
    }
  }
  const roleNames: Record<string, string> = { ADMIN: "Administración", CASHIER: "Caja", DRIVER: "Repartidor", WAITER: "Mesero", KITCHEN: "Cocina" };
  if (typeof data.role === "string" && roleNames[data.role]) detail.push({ label: "Rol", value: roleNames[data.role] });
  for (const [field, label] of [["isActive", "Acceso activo"], ["canCollectCash", "Cobro en efectivo"], ["canCollectCard", "Cobro con tarjeta"], ["canCollectTransfer", "Cobro por transferencia"]] as const) {
    if (typeof data[field] === "boolean") detail.push({ label, value: data[field] ? "Sí" : "No" });
  }
  if (context.driverName) detail.push({ label: "Repartidor", value: staffDisplayName(context.driverName) });
  if (context.subjectName) detail.push({ label: "Persona afectada", value: staffDisplayName(context.subjectName) });
  const subject = order ? `Pedido #${order.orderNumber} · ${order.businessDate}` : entry.entityType === "AdminUser" ? "Equipo y accesos" : entry.entityType === "CashRegisterShift" ? "Caja" : entry.entityType === "System" ? "Sistema" : "Registro histórico";
  const summary = `${actorName} ${verbs[entry.action] ?? "registró una actividad"}${amount !== undefined ? ` · ${formatPrice(amount)}` : ""}${context.driverName && entry.action === "DRIVER_CASH_RECEIVED" ? ` de ${staffDisplayName(context.driverName)}` : ""}.`;
  return { id: entry.id, action: entry.action, title: auditActions[entry.action] ?? "Actividad registrada", summary, actorName, createdAt: entry.createdAt.toISOString(), order, subject, intervention: data.override === true, details: detail };
}
