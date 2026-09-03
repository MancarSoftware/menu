import { describe, expect, it } from "vitest";
import { auditDetails, toAuditEntry } from "@/lib/audit-view";

const record = { id: "event1", action: "ORDER_PAYMENT_RECORDED", actorName: "driver@example.invalid", entityType: "CustomerOrder", createdAt: new Date("2026-09-03T01:00:00Z"), details: "{}" };
describe("readable audit summaries", () => {
  it("resolves legacy email actors to names and groups daily order numbers by date", () => {
    const entry = toAuditEntry(record, { actorName: "Luis Repartidor", amountCents: 2898, order: { id: 42, orderNumber: 2, businessDate: "2026-09-02" } });
    expect(entry.title).toBe("Cobro registrado");
    expect(entry.summary).toBe("Luis Repartidor registró un cobro · $28,98.");
    expect(entry.subject).toBe("Pedido #2 · 2026-09-02");
    expect(JSON.stringify(entry)).not.toContain("@");
  });
  it("preserves name snapshots and exposes only whitelisted details", () => {
    const entry = toAuditEntry({ ...record, actorName: "Nombre original", details: JSON.stringify({ override: true, overrideReason: "Problema de conexión", password: "secret-value", email: "test@example.invalid", amountCents: 100, from: "READY", to: "SERVED", paymentMethod: "CASH" }) }, { actorName: "Nombre nuevo" });
    expect(entry.actorName).toBe("Nombre original"); expect(entry.intervention).toBe(true);
    expect(entry.details).toContainEqual({ label: "Motivo de intervención", value: "Problema de conexión" });
    expect(entry.details).toContainEqual({ label: "Después", value: "Entregado" });
    expect(entry.details).toContainEqual({ label: "Medio de pago", value: "Efectivo" });
    expect(JSON.stringify(entry)).not.toContain("secret-value"); expect(JSON.stringify(entry)).not.toContain("@");
  });
  it("tolerates deleted actors, old malformed metadata and unknown actions", () => {
    for (const data of ["{bad", "null", "[]", "1"]) expect(auditDetails(data)).toEqual({});
    const entry = toAuditEntry({ ...record, action: "OLD_EVENT", details: "{bad" }, {});
    expect(entry.title).toBe("Actividad registrada"); expect(entry.order).toBeNull();
    expect(entry.summary).not.toContain("@");
  });
  it("describes cash handovers as custody, not an additional sale", () => {
    const entry = toAuditEntry({ ...record, action: "DRIVER_CASH_RECEIVED", actorName: "Ana Cajera" }, { driverName: "Luis Repartidor", amountCents: 2898 });
    expect(entry.summary).toBe("Ana Cajera recibió efectivo del repartidor · $28,98 de Luis Repartidor.");
  });
});
