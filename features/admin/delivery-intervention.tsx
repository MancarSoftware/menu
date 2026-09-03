"use client";
import { useState } from "react";
import type { DeliveryOrderView } from "@/lib/domain";

export type DriverAction = "DISPATCH" | "DELIVER" | "REPORT_ISSUE";
export function DeliveryIntervention({ order, pending, onConfirm }: { order: DeliveryOrderView; pending: boolean; onConfirm: (action: DriverAction, reason: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<DriverAction>("DELIVER");
  const action = order.deliveryStatus === "PENDING" ? "DISPATCH" : selected;
  if (order.status !== "READY" || !order.assignedDriver || !["PENDING", "OUT_FOR_DELIVERY"].includes(order.deliveryStatus)) return null;
  return <details className="delivery-intervention">
    <summary>Intervención administrativa</summary>
    <p>Solo para una excepción verificada con el repartidor. Quedarán registrados tu nombre, el cambio y el motivo.</p>
    <form onSubmit={async (event) => { event.preventDefault(); if (pending || reason.trim().length < 4) return; await onConfirm(action, reason.trim()); }}>
      <label htmlFor={`override-action-${order.id}`}>Acción excepcional</label>
      <select id={`override-action-${order.id}`} value={action} disabled={pending} onChange={(event) => setSelected(event.target.value as DriverAction)}>
        {order.deliveryStatus === "PENDING" ? <option value="DISPATCH">Registrar salida confirmada</option> : <><option value="DELIVER">Registrar entrega confirmada</option><option value="REPORT_ISSUE">Registrar incidencia de entrega</option></>}
      </select>
      <label htmlFor={`override-reason-${order.id}`}>Motivo de la intervención</label>
      <textarea id={`override-reason-${order.id}`} required minLength={4} maxLength={240} rows={3} value={reason} disabled={pending} onChange={(event) => setReason(event.target.value)} />
      <button type="submit" className="button button--line" disabled={pending || reason.trim().length < 4}>Confirmar intervención</button>
    </form>
  </details>;
}
