import { useEffect, useState, useSyncExternalStore } from "react";

export type ScanState = "approved" | "pending" | "credit";
export type ScanRecord = {
  id: string;
  ts: number;
  meal: "Breakfast" | "Lunch" | "Snacks" | "Dinner";
  state: ScanState;
  amount: number;
  balanceAfter: number;
  qr: string;
};

type Store = {
  balance: number;
  scans: ScanRecord[];
};

const KEY = "mess-store-v1";
const MEAL_COST = 50;
const DEFAULT: Store = { balance: 2480, scans: [] };

let state: Store = DEFAULT;
const listeners = new Set<() => void>();

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
}
function persist() {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
}
function emit() {
  listeners.forEach((l) => l());
}

let loaded = false;
function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") {
    load();
    loaded = true;
  }
}

export function useMessStore() {
  const snapshot = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => DEFAULT,
  );
  // hydrate on mount
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!hydrated) {
      ensureLoaded();
      setHydrated(true);
      emit();
    }
  }, [hydrated]);
  return snapshot;
}

export function getMealForNow(): ScanRecord["meal"] {
  const h = new Date().getHours();
  if (h < 10) return "Breakfast";
  if (h < 15) return "Lunch";
  if (h < 18) return "Snacks";
  return "Dinner";
}

export function previewState(): ScanState {
  ensureLoaded();
  if (state.balance >= MEAL_COST) return "approved";
  if (state.balance < 0) return "credit";
  return "pending";
}

export function commitScan(qr: string, accepted = true): ScanRecord {
  ensureLoaded();
  const meal = getMealForNow();
  let scanState: ScanState;
  let amount = 0;

  if (state.balance >= MEAL_COST) {
    scanState = "approved";
    amount = MEAL_COST;
  } else if (accepted) {
    scanState = "credit";
    amount = MEAL_COST;
  } else {
    scanState = "pending";
    amount = 0;
  }

  const balanceAfter = state.balance - amount;
  const record: ScanRecord = {
    id: crypto.randomUUID(),
    ts: Date.now(),
    meal,
    state: scanState,
    amount,
    balanceAfter,
    qr,
  };
  state = {
    balance: balanceAfter,
    scans: [record, ...state.scans].slice(0, 50),
  };
  persist();
  emit();
  return record;
}

export function resetStore(balance = 2480) {
  state = { balance, scans: [] };
  persist();
  emit();
}

export const MEAL_PRICE = MEAL_COST;
