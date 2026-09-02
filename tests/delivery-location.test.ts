// @vitest-environment jsdom
import { createElement as h, useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DeliveryLocationPicker } from "@/features/cart/delivery-location-picker";
import type { DeliveryPoint } from "@/lib/domain";

const mapMock = vi.hoisted(() => {
  const events: Record<string, (event?: unknown) => void> = {};
  const point = { lat: -0.22, lng: -78.51 };
  const map = {
    setView: vi.fn().mockReturnThis(),
    panTo: vi.fn(),
    on: vi.fn((name: string, callback: (event?: unknown) => void) => { events[name] = callback; }),
    getCenter: () => ({ wrap: () => point }),
    remove: vi.fn(),
  };
  return { events, point, map };
});
vi.mock("leaflet", () => ({ map: () => mapMock.map, tileLayer: () => ({ on: () => ({ addTo: vi.fn() }) }) }));

function Picker() {
  const [value, setValue] = useState<DeliveryPoint | null>(null);
  return h(DeliveryLocationPicker, { center: { latitude: -0.22, longitude: -78.51 }, value, onChange: setValue });
}
beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("does not ask for GPS automatically and requires deliberate map confirmation", async () => {
  const getCurrentPosition = vi.fn();
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
  render(h(Picker));
  const confirm = await screen.findByRole("button", { name: "Confirmar este punto de entrega" });
  await waitFor(() => expect(mapMock.map.on).toHaveBeenCalled());
  expect(getCurrentPosition).not.toHaveBeenCalled();
  expect((confirm as HTMLButtonElement).disabled).toBe(true);
  await act(async () => { mapMock.events.movestart(); mapMock.events.moveend(); });
  fireEvent.click(confirm);
  expect(screen.getByRole("button", { name: "Punto de entrega confirmado" })).toBeTruthy();
  await act(async () => { mapMock.events.movestart(); mapMock.events.moveend(); });
  expect(screen.getByRole("button", { name: "Confirmar este punto de entrega" })).toBeTruthy();
});

it("keeps the manual alternative usable when GPS permission is denied", async () => {
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: vi.fn((_success, failure) => failure({ code: 1 })) } });
  render(h(Picker));
  await waitFor(() => expect((screen.getByRole("button", { name: "Usar mi ubicación actual" }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "Usar mi ubicación actual" }));
  expect(screen.getByRole("alert").textContent).toContain("manualmente");
  await act(async () => { mapMock.events.moveend(); });
  fireEvent.click(screen.getByRole("button", { name: "Confirmar este punto de entrega" }));
  expect(screen.getByRole("button", { name: "Punto de entrega confirmado" })).toBeTruthy();
});

it("shows GPS accuracy and still asks the customer to confirm the destination", async () => {
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: vi.fn((success) => success({ coords: { latitude: -0.2, longitude: -78.5, accuracy: 50 } })) } });
  render(h(Picker));
  await waitFor(() => expect((screen.getByRole("button", { name: "Usar mi ubicación actual" }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "Usar mi ubicación actual" }));
  expect(screen.getByText(/Precisión GPS aproximada: 50 m/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Punto de entrega confirmado" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Confirmar este punto de entrega" }));
  expect(screen.getByRole("button", { name: "Punto de entrega confirmado" })).toBeTruthy();
});
