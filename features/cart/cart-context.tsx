"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { MenuItemView } from "@/lib/domain";

export type CartProduct = Pick<MenuItemView, "id" | "name" | "slug" | "priceCents" | "imageUrl">;
export type CartCustomization = { key: string; labels: string[]; extraPriceCents: number };
export type CartEntry = { lineId: string; product: CartProduct; quantity: number; customization: CartCustomization };

type CartContextValue = {
  entries: CartEntry[];
  count: number;
  totalCents: number;
  addItem: (product: CartProduct, quantity?: number, customization?: CartCustomization) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "el-bueno-cart-v2";
const legacyStorageKey = "el-bueno-cart-v1";
const standardCustomization: CartCustomization = { key: "standard", labels: [], extraPriceCents: 0 };

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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<CartEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let nextEntries: CartEntry[] = [];
    let cancelled = false;
    try {
      nextEntries = readStoredCart();
    } catch {
      window.localStorage.removeItem(storageKey);
      window.localStorage.removeItem(legacyStorageKey);
    }
    queueMicrotask(() => {
      if (cancelled) return;
      setEntries(nextEntries);
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(storageKey, JSON.stringify(entries));
      window.localStorage.removeItem(legacyStorageKey);
    }
  }, [entries, hydrated]);

  const value = useMemo<CartContextValue>(() => ({
    entries,
    count: entries.reduce((total, entry) => total + entry.quantity, 0),
    totalCents: entries.reduce((total, entry) => total + (entry.product.priceCents + entry.customization.extraPriceCents) * entry.quantity, 0),
    addItem(product, quantity = 1, customization = standardCustomization) {
      setEntries((current) => {
        const lineId = `${product.id}::${customization.key}`;
        const existing = current.find((entry) => entry.lineId === lineId);
        if (!existing) return [...current, { lineId, product, quantity: Math.max(1, quantity), customization }];
        return current.map((entry) => entry.lineId === lineId ? { ...entry, quantity: entry.quantity + Math.max(1, quantity) } : entry);
      });
    },
    updateQuantity(lineId, quantity) {
      setEntries((current) => quantity <= 0 ? current.filter((entry) => entry.lineId !== lineId) : current.map((entry) => entry.lineId === lineId ? { ...entry, quantity } : entry));
    },
    clearCart() { setEntries([]); },
  }), [entries]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
