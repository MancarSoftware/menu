// @vitest-environment jsdom
import { createElement as h } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CartPage } from "@/features/cart/cart-page";
import { configurableProduct } from "./fixtures/product";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/features/cart/cart-context", () => ({
  useCart: () => ({ activeOrders: [], entries: [{ lineId: "burger", product: configurableProduct, quantity: 1, customization: { key: "standard", extraPriceCents: 0, labels: [] } }], isReady: true, totalCents: 699, updateQuantity: vi.fn(), clearCart: vi.fn(), rememberOrder: vi.fn() }),
}));
vi.mock("@/features/cart/delivery-location-picker", () => ({ DeliveryLocationPicker: ({ onChange }: { onChange: (point: { latitude: number; longitude: number }) => void }) => h("button", { onClick: () => onChange({ latitude: 0, longitude: 0 }) }, "Confirm test point") }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("customer phone input", () => {
  it.each(["DELIVERY", "PICKUP"])("caps input at ten digits and blocks incomplete %s orders", async (mode) => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Test response" }) });
    vi.stubGlobal("fetch", fetchMock);
    render(h(CartPage, { whatsapp: "", pickupAddress: "Quito", city: "Quito", dineInTable: null, locationCenter: { latitude: 0, longitude: 0 } }));
    if (mode === "PICKUP") fireEvent.click(screen.getByRole("button", { name: /Retiro/ }));
    else fireEvent.click(screen.getByRole("button", { name: "Confirm test point" }));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Ana" } });
    const phone = screen.getByLabelText("Teléfono") as HTMLInputElement;
    expect(phone.maxLength).toBe(10); expect(phone.minLength).toBe(10); expect(phone.inputMode).toBe("numeric");
    fireEvent.change(phone, { target: { value: "09a- 9999999" } });
    expect(phone.value).toBe("099999999");
    const incomplete = screen.getByRole("button", { name: "Completa tus datos para ordenar" }) as HTMLButtonElement;
    expect(incomplete.disabled).toBe(true); fireEvent.click(incomplete); expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.change(phone, { target: { value: "09999999999" } });
    expect(phone.value).toBe("0999999999");
    fireEvent.click(screen.getByRole("button", { name: /Confirmar pedido/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ mode, customerPhone: "0999999999" });
    await screen.findByText("Test response");
  });
});
