// @vitest-environment jsdom
import { createElement as h } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDashboard } from "@/features/admin/admin-dashboard";
import type { RestaurantView } from "@/lib/domain";
import { deliveryReceipt, paidDelivery } from "./fixtures/delivery";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/features/admin/kitchen-board", () => ({ KitchenBoard: () => null }));
vi.mock("@/features/admin/delivery-board", () => ({ DeliveryBoard: () => null }));
const restaurant: RestaurantView = { id: 1, name: "El Bueno", tagline: "Demo", description: "Demo", address: "", city: "Guayaquil", countryCode: "EC", latitude: 0, longitude: 0, phone: "", whatsapp: "", email: "", openingHours: [], socialLinks: {} };
const renderAdmin = () => render(h(AdminDashboard, { categories: [], restaurant, tables: [], orders: [], initialMetrics: { date: "2026-09-02", revenueCents: 0, paidOrderCount: 0 }, userEmail: "demo@example.invalid", role: "ADMIN" }));
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
let logoutResponse: () => Promise<ReturnType<typeof ok>>;
const fetchMock = vi.fn(async (url: string) => {
  if (url === "/api/auth/logout") return logoutResponse();
  if (url.includes("/receipt")) return ok(deliveryReceipt);
  if (url.includes("/reports/orders")) return ok({ orders: [paidDelivery] });
  if (url.includes("/reports/revenue")) return ok({ report: { revenueCents: 2898, refundsCents: 0, netRevenueCents: 2898, paymentCount: 1, points: [] } });
  return ok({ metrics: { date: "2026-09-02", revenueCents: 2898, paidOrderCount: 1 } });
});
beforeEach(() => { document.body.insertAdjacentHTML("afterbegin", '<div id="admin-header-actions"></div>'); sessionStorage.clear(); vi.clearAllMocks(); logoutResponse = async () => ok({ ok: true }); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); document.getElementById("admin-header-actions")?.remove(); vi.unstubAllGlobals(); });

describe("admin mobile controls", () => {
  it("keeps logout outside the scrolling section menu and closes the session", async () => {
    renderAdmin();
    await act(async () => {});
    const logout = screen.getByRole("button", { name: "Cerrar sesión" });
    expect(logout.closest("nav")).toBeNull();
    expect(logout.closest("#admin-header-actions")).toBeTruthy();
    fireEvent.click(logout);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/admin/login"));
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/auth/logout")).toHaveLength(1);
    expect(sessionStorage.getItem("el-bueno-admin-section-v1")).toBeNull();
  });
  it("disables duplicate logout requests while waiting and allows retry after failure", async () => {
    let resolveLogout!: (value: ReturnType<typeof ok>) => void;
    logoutResponse = () => new Promise((resolve) => { resolveLogout = resolve; });
    renderAdmin(); await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    const waiting = screen.getByRole("button", { name: "Saliendo…" }) as HTMLButtonElement;
    expect(waiting.disabled).toBe(true);
    fireEvent.click(waiting);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/auth/logout")).toHaveLength(1);
    await act(async () => { resolveLogout({ ok: false, status: 503, json: async () => ({ error: "No hay conexión. Inténtalo otra vez." }) }); });
    expect(screen.getByRole("status").textContent).toContain("No hay conexión");
    expect((screen.getByRole("button", { name: "Cerrar sesión" }) as HTMLButtonElement).disabled).toBe(false);
    expect(router.replace).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("el-bueno-admin-section-v1")).toBe("overview");
  });
  it("keeps all order fields and receipt access in the responsive history row", async () => {
    renderAdmin(); await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "Ventas" }));
    const row = await screen.findByRole("button", { name: /#1.*Delivery.*Pagado.*Efectivo.*28,98.*Ver recibo/ });
    expect(row.querySelector(".order-history__total")?.textContent).toContain("28,98");
    fireEvent.click(row);
    expect(await screen.findByRole("dialog", { name: "Comprobante de pedido" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
