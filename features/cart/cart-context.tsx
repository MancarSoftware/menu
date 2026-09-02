"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { DeliveryStatus, MenuItemView, OrderMode, OrderStatus, OrderView } from "@/lib/domain";

export type CartProduct = Pick<MenuItemView, "id" | "name" | "slug" | "priceCents" | "imageUrl">;
export type CartCustomization = { key: string; labels: string[]; extraPriceCents: number };
export type CartEntry = { lineId: string; product: CartProduct; quantity: number; customization: CartCustomization };
export type ActiveOrderSummary = {
  publicId: string;
  orderNumber: number;
  mode: OrderMode;
  status: OrderStatus;
  deliveryStatus?: DeliveryStatus;
  createdAt: string;
  tableNumber: number | null;
  version: number;
};

type CartContextValue = {
  isReady: boolean;
  entries: CartEntry[];
  activeOrders: ActiveOrderSummary[];
  count: number;
  totalCents: number;
  addItem: (product: CartProduct, quantity?: number, customization?: CartCustomization) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
  rememberOrder: (order: OrderView) => void;
  forgetOrder: (publicId: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "el-bueno-cart-v2";
const legacyStorageKey = "el-bueno-cart-v1";
const activeOrdersStorageKey = "el-bueno-active-orders-v1";
const standardCustomization: CartCustomization = { key: "standard", labels: [], extraPriceCents: 0 };
const orderModes: OrderMode[] = ["DINE_IN", "DELIVERY", "PICKUP"];
const orderStatuses: OrderStatus[] = ["RECEIVED", "PREPARING", "READY", "SERVED", "PAID", "CANCELLED"];

function isStoredCart(value: unknown): value is CartEntry[] {
  return Array.isArray(value) && value.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const candidate = entry as Partial<CartEntry>;
    return Boolean(
      typeof candidate.lineId === "string"
      && candidate.product
      && typeof candidate.product.id === "string"
      && Number.isInteger(candidate.quantity)
      && Number(candidate.quantity) > 0
      && candidate.customization
      && typeof candidate.customization.key === "string"
      && Array.isArray(candidate.customization.labels)
      && candidate.customization.labels.every((label) => typeof label === "string")
      && Number.isInteger(candidate.customization.extraPriceCents)
      && candidate.customization.extraPriceCents >= 0,
    );
  });
}

function readStoredCart(): CartEntry[] {
  const currentValue = window.localStorage.getItem(storageKey);
  if (currentValue !== null) {
    const current: unknown = JSON.parse(currentValue);
    if (isStoredCart(current)) return current;
  }

  const legacy: unknown = JSON.parse(window.localStorage.getItem(legacyStorageKey) ?? "[]");
  if (!Array.isArray(legacy)) return [];
  return legacy.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const candidate = entry as { product?: CartProduct; quantity?: number };
    if (!candidate.product || typeof candidate.product.id !== "string" || !Number.isInteger(candidate.quantity) || Number(candidate.quantity) <= 0) return [];
    return [{ lineId: `${candidate.product.id}::standard`, product: candidate.product, quantity: Number(candidate.quantity), customization: standardCustomization }];
  });
}

function isStoredActiveOrders(value: unknown): value is ActiveOrderSummary[] {
  return Array.isArray(value) && value.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const candidate = entry as Partial<ActiveOrderSummary>;
    return typeof candidate.publicId === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(candidate.publicId)
      && Number.isInteger(candidate.orderNumber) && Number(candidate.orderNumber) > 0
      && Number.isInteger(candidate.version) && Number(candidate.version) > 0
      && orderModes.includes(candidate.mode as OrderMode)
      && orderStatuses.includes(candidate.status as OrderStatus)
      && (candidate.deliveryStatus === undefined || ["PENDING", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED"].includes(candidate.deliveryStatus))
      && typeof candidate.createdAt === "string" && Number.isFinite(Date.parse(candidate.createdAt))
      && (candidate.tableNumber === null || Number.isInteger(candidate.tableNumber));
  });
}

function toActiveOrderSummary(order: OrderView): ActiveOrderSummary {
  return {
    publicId: order.publicId,
    orderNumber: order.orderNumber,
    mode: order.mode,
    status: order.status,
    deliveryStatus: order.deliveryStatus,
    createdAt: order.createdAt,
    tableNumber: order.table?.number ?? null,
    version: order.version,
  };
}

export function activeOrderStatusLabel(status: OrderStatus, mode?: OrderMode, deliveryStatus?: DeliveryStatus) {
  if (mode === "DELIVERY" && !["PAID", "CANCELLED"].includes(status)) {
    if (deliveryStatus === "FAILED") return "Entrega en revisión";
    if (deliveryStatus === "OUT_FOR_DELIVERY") return "En camino";
    if (deliveryStatus === "DELIVERED" || status === "SERVED") return "Entregado";
  }
  return status === "RECEIVED" ? "Recibido"
    : status === "PREPARING" ? "En cocina"
      : status === "READY" ? "Listo"
        : status === "SERVED" ? "Servido"
          : status === "PAID" ? "Pagado"
            : "Cancelado";
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<CartEntry[]>([]);
  const [activeOrders, setActiveOrders] = useState<ActiveOrderSummary[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let nextEntries: CartEntry[] = [];
    let cancelled = false;
    try {
      nextEntries = readStoredCart();
    } catch {
      // Storage may be unavailable or contain an invalid previous cart.
    }
    let nextActiveOrders: ActiveOrderSummary[] = [];
    try {
      const stored: unknown = JSON.parse(window.localStorage.getItem(activeOrdersStorageKey) ?? "[]");
      if (isStoredActiveOrders(stored)) nextActiveOrders = stored;
    } catch {
      // Continue in memory if the browser does not allow storage.
    }
    queueMicrotask(() => {
      if (cancelled) return;
      setEntries(nextEntries);
      // A directly opened receipt may register its order before hydration finishes.
      setActiveOrders((current) => [...nextActiveOrders.filter((stored) => !current.some((order) => order.publicId === stored.publicId)), ...current]);
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(entries));
      window.localStorage.setItem(activeOrdersStorageKey, JSON.stringify(activeOrders));
      window.localStorage.removeItem(legacyStorageKey);
    } catch { /* Keep the current workflow usable when browser storage is blocked. */ }
  }, [activeOrders, entries, hydrated]);

  const addItem = useCallback((product: CartProduct, quantity = 1, customization = standardCustomization) => {
    setEntries((current) => {
      const lineId = `${product.id}::${customization.key}`;
      const existing = current.find((entry) => entry.lineId === lineId);
      if (!existing) return [...current, { lineId, product, quantity: Math.max(1, quantity), customization }];
      return current.map((entry) => entry.lineId === lineId ? { ...entry, quantity: entry.quantity + Math.max(1, quantity) } : entry);
    });
  }, []);

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    setEntries((current) => quantity <= 0 ? current.filter((entry) => entry.lineId !== lineId) : current.map((entry) => entry.lineId === lineId ? { ...entry, quantity } : entry));
  }, []);

  const clearCart = useCallback(() => setEntries([]), []);

  const rememberOrder = useCallback((order: OrderView) => {
    const summary = toActiveOrderSummary(order);
    setActiveOrders((current) => {
      const existing = current.find((entry) => entry.publicId === summary.publicId);
      if (existing && existing.version > summary.version) return current;
      if (existing && existing.version === summary.version && existing.orderNumber === summary.orderNumber && existing.mode === summary.mode && existing.status === summary.status && existing.deliveryStatus === summary.deliveryStatus && existing.createdAt === summary.createdAt && existing.tableNumber === summary.tableNumber) return current;
      return existing ? current.map((entry) => entry.publicId === summary.publicId ? summary : entry) : [...current, summary];
    });
  }, []);

  const forgetOrder = useCallback((publicId: string) => {
    setActiveOrders((current) => current.filter((order) => order.publicId !== publicId));
  }, []);

  const value = useMemo<CartContextValue>(() => ({
    isReady: hydrated,
    entries,
    activeOrders,
    count: entries.reduce((total, entry) => total + entry.quantity, 0),
    totalCents: entries.reduce((total, entry) => total + (entry.product.priceCents + entry.customization.extraPriceCents) * entry.quantity, 0),
    addItem,
    updateQuantity,
    clearCart,
    rememberOrder,
    forgetOrder,
  }), [activeOrders, addItem, clearCart, entries, forgetOrder, hydrated, rememberOrder, updateQuantity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
