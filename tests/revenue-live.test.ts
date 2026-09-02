// @vitest-environment jsdom
import { createElement as h } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReportsPanel } from "@/features/admin/reports-panel";

let amount: number;
const fetchMock = vi.fn(async (url: string) => ({ ok: true, status: 200, json: async () => url.includes("/revenue") ? { report: { revenueCents: amount, refundsCents: 0, netRevenueCents: amount, paymentCount: 1, points: [] } } : { orders: [] } }));
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-02T04:59:58Z")); amount = 0; fetchMock.mockClear(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
const tick = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
describe("live revenue dates", () => {
  it("refreshes collected revenue without leaving reports and rolls Today over at Ecuador midnight", async () => {
    render(h(ReportsPanel)); await tick(1);
    expect(fetchMock.mock.calls.some(([url]) => url.includes("from=2026-09-01&to=2026-09-01"))).toBe(true);
    amount = 1574;
    await tick(5000); await tick(1);
    expect(fetchMock.mock.calls.some(([url]) => url.includes("from=2026-09-02&to=2026-09-02"))).toBe(true);
    expect(screen.getAllByText(/15,74/).length).toBeGreaterThan(0);
    amount = 3148;
    fireEvent(window, new Event("focus")); await tick(1);
    expect(screen.getAllByText(/31,48/).length).toBeGreaterThan(0);
  });
  it("does not replace a manually selected historical range at midnight", async () => {
    render(h(ReportsPanel)); await tick(1);
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-08-30" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-08-31" } });
    await tick(5001);
    expect((screen.getByLabelText("Desde") as HTMLInputElement).value).toBe("2026-08-30");
    expect((screen.getByLabelText("Hasta") as HTMLInputElement).value).toBe("2026-08-31");
    expect(fetchMock.mock.calls.some(([url]) => url.includes("from=2026-08-30&to=2026-08-31"))).toBe(true);
  });
});
