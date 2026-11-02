"use client";

import { useEffect, useState } from "react";

// The shop basket lives on this device only (localStorage) until the order is placed.
// It holds one pharmacy at a time: each order is delivered by one pharmacy.

export type BasketItem = {
  productId: string;
  name: string;
  /** active ingredient: matched against prescriptions too ("Amoxil" is amoxicillin) */
  genericName?: string;
  strength?: string;
  image?: string;
  priceCents: number;
  quantity: number;
  requiresPrescription: boolean;
};

export type Basket = {
  pharmacy: { _id: string; name: string; deliveryFeeCents: number; distanceKm: number };
  /** where the shop was showing pharmacies for: the order is delivered there */
  deliverTo: { where: "current" | "home"; point?: { lat: number; lng: number } };
  items: BasketItem[];
};

const KEY = "shop-basket";
const MAX_QUANTITY = 20;
const listeners = new Set<(b: Basket | null) => void>();

function read(): Basket | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Basket) : null;
  } catch {
    return null;
  }
}

function write(basket: Basket | null) {
  try {
    if (basket && basket.items.length) localStorage.setItem(KEY, JSON.stringify(basket));
    else localStorage.removeItem(KEY);
  } catch {
    // private mode / storage full: the basket just won't survive a reload
  }
  const value = basket && basket.items.length ? basket : null;
  listeners.forEach((fn) => fn(value));
}

export const basket = {
  get: read,

  /** Adds to the basket. Returns false (and changes nothing) if it's from a different pharmacy. */
  add(item: Omit<BasketItem, "quantity">, pharmacy: Basket["pharmacy"], deliverTo: Basket["deliverTo"], quantity = 1, replace = false) {
    const current = read();
    if (current && current.pharmacy._id !== pharmacy._id && !replace) return false;
    const base: Basket = current && current.pharmacy._id === pharmacy._id ? current : { pharmacy, deliverTo, items: [] };
    const existing = base.items.find((i) => i.productId === item.productId);
    if (existing) existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + quantity);
    else base.items.push({ ...item, quantity: Math.min(MAX_QUANTITY, quantity) });
    write({ ...base, deliverTo });
    return true;
  },

  setQuantity(productId: string, quantity: number) {
    const current = read();
    if (!current) return;
    current.items = current.items
      .map((i) => (i.productId === productId ? { ...i, quantity: Math.min(MAX_QUANTITY, quantity) } : i))
      .filter((i) => i.quantity > 0);
    write(current);
  },

  clear: () => write(null),
};

/** The basket, kept in sync across the page (and other tabs). */
export function useBasket() {
  const [value, setValue] = useState<Basket | null>(null);
  useEffect(() => {
    setValue(read());
    listeners.add(setValue);
    const onStorage = (e: StorageEvent) => e.key === KEY && setValue(read());
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(setValue);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return value;
}

export const basketTotals = (b: Basket | null) => {
  const items = b?.items ?? [];
  const subtotal = items.reduce((n, i) => n + i.priceCents * i.quantity, 0);
  const count = items.reduce((n, i) => n + i.quantity, 0);
  return { subtotal, count, total: items.length ? subtotal + (b?.pharmacy.deliveryFeeCents ?? 0) : 0 };
};
