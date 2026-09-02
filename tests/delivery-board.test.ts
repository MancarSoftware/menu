// @vitest-environment jsdom
import { createElement as h } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeliveryBoard } from "@/features/admin/delivery-board";
import { deliveredOrder, paidDelivery } from "./fixtures/delivery";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const response = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
let paid: boolean;
const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
  if (options?.method === "PATCH") { paid = true; return response({ order: paidDelivery }); }
  const history = new URL(url, "http://localhost").searchParams.get("view") === "history";
  const orders = history ? [paidDelivery] : paid ? [] : [deliveredOrder];
  return response({ orders, drivers: [], allowedPaymentMethods: ["CASH", "TRANSFER"], canCollectCash: true, total: orders.length, page: 1, pageSize: 20 });
});
beforeEach(() => { paid = false; fetchMock.mockClear(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("driver history and collection", () => {
  it("requires confirmation and uses only authorized methods; paid deliveries remain in history after remount", async () => {
    const first = render(h(DeliveryBoard, { manager: false }));
    fireEvent.click(await screen.findByRole("button", { name: "Registrar cobro" }));
    const selector = screen.getByLabelText("Método recibido");
    expect(screen.queryByRole("option", { name: "Tarjeta" })).toBeNull();
    fireEvent.change(selector, { target: { value: "TRANSFER" } });
    const confirm = screen.getByRole("button", { name: /Confirmar cobro/ }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    expect(screen.getByText(/no aceptes solo una captura/)).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(confirm);
    await waitFor(() => expect(screen.getByText("Todo al día")).toBeTruthy());
    const mutation = fetchMock.mock.calls.find(([, options]) => options?.method === "PATCH");
    expect(JSON.parse(String(mutation?.[1]?.body))).toEqual({ status: "PAID", paymentMethod: "TRANSFER", version: 4 });
    first.unmount();
    render(h(DeliveryBoard, { manager: false }));
    fireEvent.click(screen.getByRole("button", { name: "Completadas" }));
    expect(await screen.findByText("Pedido #1")).toBeTruthy();
    expect(screen.getByRole("link", { name: /imprimir comprobante/ }).getAttribute("href")).toBe("/admin/pedidos/42/comprobante");
    expect(screen.queryByRole("button", { name: "Registrar cobro" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Fecha de entrega"), { target: { value: "2026-09-02" } });
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.includes("date=2026-09-02"))).toBe(true));
  });
});
