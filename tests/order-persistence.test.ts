// @vitest-environment jsdom
import { createElement as h, useEffect } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CartProvider, useCart } from "@/features/cart/cart-context";
import { CartPage } from "@/features/cart/cart-page";
import { AppChrome } from "@/components/app-chrome";
import { AdminDashboard } from "@/features/admin/admin-dashboard";
import type { OrderView, RestaurantView } from "@/lib/domain";

const navigation = vi.hoisted(() => ({ pathname: "/menu", router: { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() } }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname, useRouter: () => navigation.router }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => h("a", props, children) }));
vi.mock("next/image", () => ({ default: () => null }));

const order: OrderView = {
  id: 42, publicId: "order42", orderNumber: 42, businessDate: "2026-09-01", mode: "PICKUP", status: "RECEIVED",
  paymentStatus: "PENDING", paymentMethod: null, subtotalCents: 699, totalCents: 699, notes: "",
  customerName: "Test customer", customerPhone: "0990000000", deliveryAddress: null,
  acknowledgedAt: null, version: 1, createdAt: "2026-09-01T18:00:00.000Z", table: null,
  items: [{ id: "item42", productName: "Test burger", quantity: 1, unitPriceCents: 699, lineTotalCents: 699, customization: [] }],
};
const restaurant: RestaurantView = {
  id: 1, name: "El Bueno", tagline: "Test", description: "Test", address: "Quito", city: "Quito", countryCode: "EC",
  latitude: 0, longitude: 0, phone: "", whatsapp: "", email: "", openingHours: [], socialLinks: {},
};
const key = "el-bueno-active-orders-v1";

function Controls({ initialOrder }: { initialOrder?: OrderView }) {
  const { rememberOrder, clearCart, activeOrders } = useCart();
  useEffect(() => { if (initialOrder) rememberOrder(initialOrder); }, [initialOrder, rememberOrder]);
  return h("div", null,
    h("button", { onClick: () => { rememberOrder(order); clearCart(); } }, "Submit fixture"),
    h("button", { onClick: () => rememberOrder({ ...order, status: "PREPARING", version: 2 }) }, "Prepare fixture"),
    h("output", null, activeOrders.map((entry) => `${entry.publicId}:${entry.status}`).join(",")),
  );
}

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  navigation.pathname = "/menu";
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Offline")));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("customer order continuity", () => {
  it("restores submitted orders in both the menu links and empty cart after a reload", async () => {
    const first = render(h(CartProvider, { children: h(Controls) }));
    await act(async () => {});
    fireEvent.click(screen.getByText("Submit fixture"));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(key) ?? "[]")).toHaveLength(1));
    expect(localStorage.getItem(key)).not.toContain(order.customerPhone);
    first.unmount();

    render(h(CartProvider, { children: h(AppChrome, { children: h(CartPage, { whatsapp: "", pickupAddress: "Quito", city: "Quito", dineInTable: null }) }) }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Tus pedidos siguen aquí" })).toBeTruthy());
    expect(screen.getByRole("link", { name: "#42 Recibido" }).getAttribute("href")).toBe("/pedido/order42");
    expect(screen.getByRole("link", { name: "Pedido #42 Recibido" }).getAttribute("href")).toBe("/pedido/order42");
  });

  it("merges an opened receipt with stored orders without losing either during hydration", async () => {
    localStorage.setItem(key, JSON.stringify([{ publicId: "olderOrder", orderNumber: 41, mode: "PICKUP", status: "READY", createdAt: order.createdAt, tableNumber: null, version: 3 }]));
    render(h(CartProvider, { children: h(Controls, { initialOrder: order }) }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("olderOrder:READY,order42:RECEIVED"));
  });

  it("does not let a stale response roll back the stored order stage", async () => {
    render(h(CartProvider, { children: h(Controls) }));
    await act(async () => {});
    fireEvent.click(screen.getByText("Prepare fixture"));
    fireEvent.click(screen.getByText("Submit fixture"));
    expect(screen.getByRole("status").textContent).toBe("order42:PREPARING");
  });

  it("recovers from malformed storage", async () => {
    localStorage.setItem(key, "not json");
    render(h(CartProvider, { children: h(Controls) }));
    await act(async () => {});
    fireEvent.click(screen.getByText("Submit fixture"));
    expect(screen.getByRole("status").textContent).toBe("order42:RECEIVED");
  });

  it("does not close the current table session using an old paid order", async () => {
    const fetchMock = vi.fn<(url: string) => Promise<Partial<Response>>>().mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: "Not the current table" }) });
    vi.stubGlobal("fetch", fetchMock);
    const paidOrder: OrderView = { ...order, mode: "DINE_IN", status: "PAID", table: { id: "table1", number: 1, name: "Mesa 1" } };
    render(h(CartProvider, { children: h(AppChrome, { children: h(Controls, { initialOrder: paidOrder }) }) }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole("link", { name: /#42/ })).toBeNull());
    expect(fetchMock.mock.calls.every(([url]) => url !== "/api/dine-in/session")).toBe(true);
  });
});

describe("kitchen continuity", () => {
  it("keeps live tickets and their stages across sections and restores the kitchen on remount", async () => {
    let serverOrder = order;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, options?: RequestInit) => {
      if (options?.method === "PATCH") {
        serverOrder = { ...order, status: "PREPARING", acknowledgedAt: order.createdAt, version: 2 };
        return { ok: true, status: 200, json: async () => ({ order: serverOrder }) };
      }
      return { ok: true, status: 200, json: async () => ({ orders: [serverOrder] }) };
    }));
    const dashboard = (orders: OrderView[]) => h(AdminDashboard, {
      categories: [], restaurant, tables: [], orders, initialMetrics: { date: "2026-09-01", revenueCents: 0, paidOrderCount: 0 },
      userEmail: "test@example.invalid", role: "ADMIN",
    });
    const first = render(dashboard([]));
    await waitFor(() => expect(screen.getByText("#42")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Cocina" }));
    fireEvent.click(screen.getByRole("button", { name: "Empezar" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Marcar listo" })).toBeTruthy());
    first.rerender(dashboard([]));
    expect(screen.getByRole("button", { name: "Marcar listo" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Resumen" }));
    expect(screen.getByText("#42").closest("[hidden]")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cocina" }));
    expect(screen.getByRole("button", { name: "Marcar listo" })).toBeTruthy();
    expect(sessionStorage.getItem("el-bueno-admin-section-v1")).toBe("orders");
    first.unmount();

    render(dashboard([serverOrder]));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Cocina" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Marcar listo" })).toBeTruthy();
  });
});
