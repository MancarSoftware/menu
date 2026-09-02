// @vitest-environment jsdom
import { createElement as h, useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDashboard } from "@/features/admin/admin-dashboard";
import { ProductCustomizationEditor, fromOptionsDraft, toOptionsDraft } from "@/features/admin/product-customization-editor";
import { DishDialog } from "@/features/menu/dish-dialog";
import { CartProvider, useCart } from "@/features/cart/cart-context";
import { emptyProductOptions } from "@/lib/product-customization";
import type { MenuCategoryView, RestaurantView } from "@/lib/domain";
import { configurableProduct as product, productOptions } from "./fixtures/product";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/features/admin/kitchen-board", () => ({ KitchenBoard: () => null }));
vi.mock("@/features/admin/delivery-board", () => ({ DeliveryBoard: () => null }));
const restaurant: RestaurantView = { id: 1, name: "El Bueno", tagline: "Demo", description: "Demo", address: "", city: "Guayaquil", countryCode: "EC", latitude: 0, longitude: 0, phone: "", whatsapp: "", email: "", openingHours: [], socialLinks: {} };
const categories: MenuCategoryView[] = [{ id: "burgers", slug: "hamburguesas", name: "Hamburguesas", description: "Prueba", displayOrder: 0, isActive: true, items: [product] }];
const writes: unknown[] = [];
let saveFails = false;
beforeEach(() => {
  sessionStorage.clear(); localStorage.clear(); vi.clearAllMocks(); writes.length = 0; saveFails = false;
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  HTMLElement.prototype.scrollIntoView = vi.fn();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); };
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url.startsWith("/api/items")) {
      writes.push(JSON.parse(String(init?.body)));
      return { ok: !saveFails, status: saveFails ? 503 : 200, json: async () => saveFails ? { error: "Inténtalo de nuevo." } : { item: product } };
    }
    return { ok: true, status: 200, json: async () => ({ metrics: { date: "2026-09-02", revenueCents: 0, paidOrderCount: 0 } }) };
  }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function EditorHarness() {
  const [value, setValue] = useState(toOptionsDraft(emptyProductOptions()));
  return h("form", null, h(ProductCustomizationEditor, { value, onChange: setValue, ingredients: product.ingredients, error: null, disabled: false }), h("output", null, JSON.stringify(fromOptionsDraft(value))));
}
function CartHarness() {
  const [open, setOpen] = useState(true);
  const cart = useCart();
  return h("div", null, h(DishDialog, { item: open ? product : null, onClose: () => setOpen(false), whatsapp: "", dineInTable: null }), h("output", { "aria-label": "Cart total" }, `${cart.count}:${cart.totalCents}:${cart.entries[0]?.customization.labels.join(";")}`));
}
const renderAdmin = () => render(h(AdminDashboard, { categories, restaurant, tables: [], orders: [], initialMetrics: { date: "2026-09-02", revenueCents: 0, paidOrderCount: 0 }, userEmail: "demo@example.invalid", role: "ADMIN" }));

describe("product customization editor and customer flow", () => {
  it("adds, edits and removes options, and explicitly selects removable ingredients", () => {
    render(h(EditorHarness));
    expect(screen.getByText("Sin extras adicionales.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Añadir extra" }));
    fireEvent.change(screen.getByLabelText("Extras: nombre 1"), { target: { value: "Aguacate" } });
    fireEvent.change(screen.getByLabelText("Recargo USD 1"), { target: { value: "1.25" } });
    fireEvent.click(screen.getByLabelText("Carne"));
    expect(screen.getByRole("status").textContent).toContain('"priceCents":125');
    expect(screen.getByRole("status").textContent).toContain('"removableIngredients":["Carne"]');
    fireEvent.click(screen.getByRole("button", { name: "Eliminar extras 1" }));
    expect(screen.getByText("Sin extras adicionales.")).toBeTruthy();
  });
  it("loads settings, sends product-specific edits and reloads server data on reopen", async () => {
    renderAdmin(); await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "Productos" }));
    fireEvent.click(screen.getByRole("button", { name: `Editar ${product.name}` }));
    expect((screen.getByLabelText("Extras: nombre 1") as HTMLInputElement).value).toBe("Queso");
    fireEvent.change(screen.getByLabelText("Máximo de salsas por unidad"), { target: { value: "2" } });
    fireEvent.click(screen.getByLabelText("Carne"));
    fireEvent.submit(screen.getByRole("button", { name: "Guardar producto" }).closest("form")!);
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toEqual(expect.objectContaining({ customizationOptions: { ...productOptions, maxSauces: 2, removableIngredients: ["Lechuga"] } }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Publicar producto" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: `Editar ${product.name}` }));
    expect((screen.getByLabelText("Máximo de salsas por unidad") as HTMLInputElement).value).toBe("1"); // reloads current server props, not the last draft
  });
  it("retains a failed save draft and blocks duplicate names with an inline message", async () => {
    renderAdmin(); await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "Productos" }));
    fireEvent.click(screen.getByRole("button", { name: `Editar ${product.name}` }));
    fireEvent.change(screen.getByLabelText("Extras: nombre 2"), { target: { value: "Queso" } });
    fireEvent.submit(screen.getByRole("button", { name: "Guardar producto" }).closest("form")!);
    expect(screen.getByRole("alert").textContent).toContain("No repitas nombres");
    expect(writes).toHaveLength(0);
    fireEvent.change(screen.getByLabelText("Extras: nombre 2"), { target: { value: "Extra de prueba" } });
    saveFails = true;
    fireEvent.submit(screen.getByRole("button", { name: "Guardar producto" }).closest("form")!);
    await waitFor(() => expect(writes).toHaveLength(1));
    await waitFor(() => expect((screen.getByRole("button", { name: "Guardar producto" }) as HTMLButtonElement).disabled).toBe(false));
    expect((screen.getByLabelText("Extras: nombre 2") as HTMLInputElement).value).toBe("Extra de prueba");
  });
  it("enforces saved limits and totals two customized products, with close still working after Add", async () => {
    render(h(CartProvider, { children: h(CartHarness) })); await act(async () => {});
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("radio", { name: /Doble/ }));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Queso/ }));
    expect((within(dialog).getByRole("checkbox", { name: /Tocino/ }) as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "BBQ + miel" }));
    expect((within(dialog).getByRole("checkbox", { name: "Ajo | limón" }) as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Sin carne" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Aumentar cantidad" }));
    fireEvent.click(within(dialog).getByRole("button", { name: /Añadir ·/ }));
    expect(screen.getByLabelText("Cart total").textContent).toBe("2:1998:Tamaño: Doble;Extras: Queso;Salsas: BBQ + miel;Sin: Carne");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cerrar detalle" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
