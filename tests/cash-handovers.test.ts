// @vitest-environment jsdom
import { createElement as h } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CashHandovers } from "@/features/admin/cash-handovers";

const mock = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/features/admin/admin-api", () => ({ requestJson: mock.request }));
const item = { id: "payment1", driverName: "Ana Repartidora", amountCents: 1574, orderNumber: 1, orderDate: "2026-09-02", createdAt: "2026-09-02T05:10:00Z", canReceive: true };
let received = false;
beforeEach(() => {
  received = false; vi.resetAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  mock.request.mockImplementation(async (_url: string, method?: string) => {
    if (method === "POST") { received = true; return { id: "handover1" }; }
    return { pending: received ? [] : [item], pendingCount: received ? 0 : 1, totalPendingCents: received ? 0 : 1574, history: received ? [{ ...item, receivedByName: "Luis Cajero" }] : [] };
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("physical cash handover UI", () => {
  it("gives drivers their balance and history but no receipt-confirmation action", async () => {
    render(h(CashHandovers, { manager: false }));
    expect(await screen.findByText("Ana Repartidora")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Mi efectivo por entregar" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Confirmar recepción" })).toBeNull();
    expect(screen.getByText(/solo caja puede confirmar/)).toBeTruthy();
  });
  it("records confirmed receipt, refreshes the shift and keeps history after remount", async () => {
    const reload = vi.fn(async () => {});
    const view = render(h(CashHandovers, { manager: true, onReceived: reload }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar recepción" }));
    await waitFor(() => expect(reload).toHaveBeenCalledOnce());
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("físicamente"));
    expect(mock.request).toHaveBeenCalledWith("/api/admin/cash-handovers", "POST", { paymentEventId: "payment1", confirmedReceived: true });
    expect(await screen.findByText("No hay entregas de efectivo pendientes.")).toBeTruthy();
    expect(screen.getByText(/No se agregó otra venta/)).toBeTruthy();
    view.unmount(); render(h(CashHandovers, { manager: true }));
    expect(await screen.findByText("Ana Repartidora → Luis Cajero")).toBeTruthy();
    expect(mock.request.mock.calls.filter(([, method]) => method === "POST")).toHaveLength(1);
  });
  it("does nothing when the cashier declines physical confirmation", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    render(h(CashHandovers, { manager: true }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar recepción" }));
    expect(mock.request.mock.calls.filter(([, method]) => method === "POST")).toHaveLength(0);
  });
  it("retains the pending balance and blocks confirmations after a refresh failure", async () => {
    render(h(CashHandovers, { manager: true }));
    await screen.findByText("Ana Repartidora");
    mock.request.mockRejectedValue(new Error("Sin conexión"));
    fireEvent.click(screen.getByRole("button", { name: "Actualizar entregas" }));
    expect((await screen.findByRole("alert")).textContent).toContain("desactualizados");
    expect(screen.getByText("Ana Repartidora")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Confirmar recepción" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
