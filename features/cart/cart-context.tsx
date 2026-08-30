"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { MenuItemView } from "@/lib/domain";

export type CartProduct = Pick<MenuItemView, "id" | "name" | "slug" | "priceCents" | "imageUrl">;
export type CartEntry = { product: CartProduct; quantity: number };

type CartContextValue = {
  entries: CartEntry[];
  count: number;
  totalCents: number;
  addItem: (product: CartProduct, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "el-bueno-cart-v1";

function isStoredCart(value: unknown): value is CartEntry[] {
  return Array.isArray(value) && value.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const candidate = entry as Partial<CartEntry>;
    return Boolean(candidate.product && typeof candidate.product.id === "string" && Number.isInteger(candidate.quantity) && Number(candidate.quantity) > 0);
  });
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<CartEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let nextEntries: CartEntry[] = [];
    let cancelled = false;
    try {
      const stored: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
      if (isStoredCart(stored)) nextEntries = stored;
    } catch {
      window.localStorage.removeItem(storageKey);
    }
    queueMicrotask(() => {
      if (cancelled) return;
      setEntries(nextEntries);
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(storageKey, JSON.stringify(entries));
  }, [entries, hydrated]);

  const value = useMemo<CartContextValue>(() => ({
    entries,
    count: entries.reduce((total, entry) => total + entry.quantity, 0),
    totalCents: entries.reduce((total, entry) => total + entry.product.priceCents * entry.quantity, 0),
    addItem(product, quantity = 1) {
      setEntries((current) => {
        const existing = current.find((entry) => entry.product.id === product.id);
        if (!existing) return [...current, { product, quantity: Math.max(1, quantity) }];
        return current.map((entry) => entry.product.id === product.id ? { ...entry, quantity: entry.quantity + Math.max(1, quantity) } : entry);
      });
    },
    updateQuantity(productId, quantity) {
      setEntries((current) => quantity <= 0 ? current.filter((entry) => entry.product.id !== productId) : current.map((entry) => entry.product.id === productId ? { ...entry, quantity } : entry));
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
