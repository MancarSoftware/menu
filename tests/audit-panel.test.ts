// @vitest-environment jsdom
import { createElement as h } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditPanel } from "@/features/admin/audit-panel";
import { toAuditEntry } from "@/lib/audit-view";
const entry = toAuditEntry({ id: "audit1", action: "DELIVERY_DELIVER", actorName: "Ana", entityType: "CustomerOrder", createdAt: new Date("2026-09-03T01:00:00Z"), details: "{}" }, { order: { id: 42, orderNumber: 2, businessDate: "2026-09-02" } });
const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ entries: [entry, { ...entry, id: "audit2" }], total: 2, page: 1, pageSize: 25, totalPages: 1 }) }));
beforeEach(() => { fetchMock.mockClear(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("audit panel", () => {
  it("groups an order's events, expands details, and can query its complete history", async () => {
    render(h(AuditPanel, { users: [{ id: "driver1", name: "Ana" }] }));
    fireEvent.click(await screen.findByText("Pedido #2 · 2026-09-02"));
    expect(screen.getAllByText("Entrega confirmada", { selector: "strong" })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Ver todo el pedido" }));
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith("/api/admin/audit?orderId=42&page=1", expect.anything()));
    expect(screen.queryByRole("navigation", { name: "Páginas de auditoría" })).toBeNull();
  });
  it("loads changed filters and resetting already empty filters does not blank the panel", async () => {
    render(h(AuditPanel, { users: [] })); await screen.findByText("Pedido #2 · 2026-09-02");
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(await screen.findByText("Pedido #2 · 2026-09-02")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-09-02" } });
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith("/api/admin/audit?from=2026-09-02&page=1", expect.anything()));
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith("/api/admin/audit?page=1", expect.anything()));
    expect(await screen.findByText("Pedido #2 · 2026-09-02")).toBeTruthy();
  });
});
