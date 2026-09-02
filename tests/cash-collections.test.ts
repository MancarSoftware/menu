// @vitest-environment jsdom
import { createElement as h } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CashCollections } from "@/features/admin/cash-collections";
import { CashRegister } from "@/features/admin/cash-register";
import { cashShift, collectionFixture } from "./fixtures/cash-collections";

let collections = collectionFixture();
let failCollections = false;
let failShifts = false;
const fetchMock = vi.fn(async (url: string) => {
  const isCollections = url.includes("cash-collections");
  const failed = isCollections ? failCollections : failShifts;
  const params = new URL(url, "http://localhost").searchParams;
  return { ok: !failed, status: failed ? 500 : 200, json: async () => failed ? { error: "Sin conexión al servidor." } : isCollections ? { collections: { ...collections, date: params.get("date"), page: Number(params.get("page")) } } : { shifts: [cashShift] } };
});
const tick = async (ms = 1) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-02T04:59:58Z"));
  collections = collectionFixture(); failCollections = false; failShifts = false; fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("live cash collection panel", () => {
  it("shows all methods, refunds, collector names, shift and receipt without emails", async () => {
    const { container } = render(h(CashCollections)); await tick();
    for (const label of ["Total cobrado", "Efectivo", "Tarjeta", "Transferencia", "Reembolsos totales", "Neto del día", "Ana Repartidora", "Sin turno de caja"]) expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    expect(container.textContent).toContain("90,74"); expect(container.textContent).toContain("83,24");
    expect(container.textContent).not.toContain("@");
    expect(screen.getByRole("link", { name: /pedido 1 del 2026-09-01/ }).getAttribute("href")).toBe("/admin/pedidos/42/comprobante");
    expect(screen.getAllByText(/test-shift-01/).length).toBeGreaterThan(0);
  });
  it("updates new driver collections automatically and rolls Today over at Ecuador midnight", async () => {
    render(h(CashCollections)); await tick();
    expect((screen.getByLabelText("Fecha de cobro") as HTMLInputElement).value).toBe("2026-09-01");
    collections.totals.collectedCents = 10648;
    await tick(5001); await tick();
    expect((screen.getByLabelText("Fecha de cobro") as HTMLInputElement).value).toBe("2026-09-02");
    expect(screen.getByText(/106,48/)).toBeTruthy();
    collections.totals.collectedCents = 12222;
    fireEvent(window, new Event("focus")); await tick(); expect(screen.getByText(/122,22/)).toBeTruthy();
    collections.totals.collectedCents = 13796;
    fireEvent(window, new Event("online")); await tick(); expect(screen.getByText(/137,96/)).toBeTruthy();
  });
  it("keeps historical dates selected and resets pagination on date changes", async () => {
    render(h(CashCollections)); await tick();
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente de cobros" })); await tick();
    expect(screen.getByText(/Página 2 de 2/)).toBeTruthy();
    expect(screen.getByText(/90,74/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Fecha de cobro"), { target: { value: "2026-08-30" } }); await tick(5001); await tick();
    expect((screen.getByLabelText("Fecha de cobro") as HTMLInputElement).value).toBe("2026-08-30");
    expect(screen.getByText(/Página 1 de 2/)).toBeTruthy();
    expect(fetchMock.mock.calls.some(([url]) => url.endsWith("date=2026-08-30&page=1"))).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Hoy" })); await tick();
    expect((screen.getByLabelText("Fecha de cobro") as HTMLInputElement).value).toBe("2026-09-02");
  });
  it("marks stale totals on failure and clears the error after a manual retry", async () => {
    render(h(CashCollections)); await tick(); failCollections = true;
    await tick(5001); await tick();
    // A new day is loading; select it successfully before testing stale data.
    failCollections = false; fireEvent.click(screen.getByRole("button", { name: "Actualizar cobros" })); await tick();
    failCollections = true; fireEvent(window, new Event("online")); await tick();
    expect(screen.getByRole("alert").textContent).toContain("desactualizados");
    expect(screen.getByText(/90,74/)).toBeTruthy();
    failCollections = false; fireEvent.click(screen.getByRole("button", { name: "Actualizar cobros" })); await tick();
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("does not present failed loading as zero collections", async () => {
    failCollections = true; render(h(CashCollections)); await tick();
    expect(screen.getByRole("alert").textContent).toContain("No se han podido consultar");
    expect(screen.queryByText("Total cobrado")).toBeNull();
  });
  it("explains an empty day and disables pagination", async () => {
    collections = { ...collections, events: [], totalEvents: 0, totalPages: 1, totals: { collectedCents: 0, refundsCents: 0, netCents: 0, paymentCount: 0 } };
    render(h(CashCollections)); await tick();
    expect(screen.getByText(/No hay cobros ni reembolsos/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Página siguiente de cobros" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("keeps all-method daily totals separate from cash-only shift reconciliation", async () => {
    render(h(CashRegister)); await tick();
    expect(screen.getByText(/90,74/)).toBeTruthy();
    expect(screen.getByText(/50,74/)).toBeTruthy();
    const shiftSection = screen.getByRole("heading", { name: "Caja abierta" }).closest("section")!;
    expect(within(shiftSection).queryByText(/90,74/)).toBeNull();
    expect(within(shiftSection).getByText("Efectivo neto del turno")).toBeTruthy();
  });
  it("does not offer an opening form when shift loading fails", async () => {
    failShifts = true; render(h(CashRegister)); await tick();
    expect(screen.getByText("Consultando caja")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Abrir caja" })).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("No operes con importes desactualizados");
    failShifts = false; fireEvent.click(screen.getByRole("button", { name: "Reintentar" })); await tick();
    expect(screen.getByRole("heading", { name: "Caja abierta" })).toBeTruthy();
  });
  it("ignores an old date response that finishes after the new selection", async () => {
    let finishOld: (value: Awaited<ReturnType<typeof fetchMock>>) => void = () => {};
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }));
    render(h(CashCollections)); await tick();
    fireEvent.change(screen.getByLabelText("Fecha de cobro"), { target: { value: "2026-08-30" } }); await tick();
    await act(async () => finishOld({ ok: true, status: 200, json: async () => ({ collections: { ...collectionFixture(), totals: { collectedCents: 99999, refundsCents: 0, netCents: 99999, paymentCount: 1 } } }) }));
    expect(screen.queryByText(/999,99/)).toBeNull();
    expect(screen.getByText(/90,74/)).toBeTruthy();
  });
});
