// @vitest-environment jsdom
import { createElement as h } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeliveryBoard } from "@/features/admin/delivery-board";
import { DeliveryDestination } from "@/features/admin/delivery-destination";
import { DriverDashboard } from "@/features/admin/driver-dashboard";
import { deliveredOrder } from "./fixtures/delivery";
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const response = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const fetchMock = vi.fn();
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const order = { ...deliveredOrder, status: "READY", deliveryStatus: "OUT_FOR_DELIVERY" };
const feed = { orders: [order], drivers: [{ id: "driver1", name: "Ana Repartidora" }], canOverride: true, allowedPaymentMethods: [], total: 1, page: 1, pageSize: 20 };
describe("role-specific delivery UI", () => {
  it("separates admin intervention from driver buttons and requires its reason", async () => {
    fetchMock.mockResolvedValue(response(feed));
    render(h(DeliveryBoard, { manager: true }));
    expect(await screen.findByText("Intervención administrativa")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Confirmar entrega" })).toBeNull();
    expect(screen.queryByRole("button", { name: "No pude entregar" })).toBeNull();
    fireEvent.click(screen.getByText("Intervención administrativa"));
    const button = screen.getByRole("button", { name: "Confirmar intervención" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Motivo de la intervención"), { target: { value: "Repartidor sin conexión" } });
    fireEvent.click(button);
    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(true));
    const mutation = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(JSON.parse(mutation?.[1].body)).toEqual({ action: "DELIVER", version: 4, override: true, overrideReason: "Repartidor sin conexión" });
  });
  it("does not expose admin interventions to cashiers", async () => {
    fetchMock.mockResolvedValue(response({ ...feed, canOverride: false }));
    render(h(DeliveryBoard, { manager: true })); await screen.findByText("Pedido #1");
    expect(screen.queryByText("Intervención administrativa")).toBeNull();
    expect(screen.queryByRole("button", { name: "Confirmar entrega" })).toBeNull();
  });
  it("keeps driver's own delivery actions and avoids single-page pagination", async () => {
    fetchMock.mockResolvedValue(response({ ...feed, canOverride: false }));
    render(h(DeliveryBoard, { manager: false }));
    expect(await screen.findByRole("button", { name: "Confirmar entrega" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "No pude entregar" })).toBeTruthy();
    expect(screen.queryByLabelText("Repartidor del pedido 1")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Completadas" }));
    await screen.findByText("Pedido #1");
    expect(screen.queryByRole("navigation", { name: "Páginas de entregas" })).toBeNull();
    expect(screen.getByText("Mostrando todas las fechas")).toBeTruthy();
  });
  it.each([true, false])("only exposes cash handover navigation when relevant: %s", async (visible) => {
    fetchMock.mockImplementation(async (url: string) => response(url.includes("cash-handovers") ? { visible } : feed));
    render(h(DriverDashboard));
    await screen.findByText("Pedido #1");
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.includes("cash-handovers"))).toBe(true));
    expect(!!screen.queryByRole("button", { name: "Efectivo por entregar" })).toBe(visible);
    expect(screen.queryByRole("button", { name: "Mi efectivo" })).toBeNull();
    expect(screen.getByRole("button", { name: "Salir" })).toBeTruthy();
  });
});
describe("delivery destination", () => {
  it("uses coordinates ahead of typed reference, including zero, and loads the preview only on request", () => {
    render(h(DeliveryDestination, { order: { ...deliveredOrder, deliveryLatitude: 0, deliveryLongitude: 0 } }));
    expect(screen.getByText("Referencia:")).toBeTruthy();
    const route = screen.getByRole("link", { name: "Abrir ruta" }).getAttribute("href")!;
    expect(new URL(route).searchParams.get("destination")).toBe("0,0");
    expect(screen.queryByTitle("Punto de entrega confirmado en OpenStreetMap")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ver punto" }));
    expect(screen.getByTitle("Punto de entrega confirmado en OpenStreetMap").getAttribute("src")).toContain("marker=0%2C0");
    fireEvent.click(screen.getByRole("button", { name: "Ocultar mapa" }));
    expect(screen.queryByTitle("Punto de entrega confirmado en OpenStreetMap")).toBeNull();
  });
  it("explicitly labels legacy address-only orders without pretending they have GPS", () => {
    render(h(DeliveryDestination, { order: { ...deliveredOrder, deliveryLatitude: null, deliveryLongitude: null } }));
    expect(screen.getByText("Pedido anterior sin punto confirmado")).toBeTruthy();
    expect(screen.getByText("Dirección antigua:")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ver punto" })).toBeNull();
  });
});
