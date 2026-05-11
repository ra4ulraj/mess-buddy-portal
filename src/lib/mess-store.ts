import { useEffect, useState, useSyncExternalStore } from "react";

export type ScanState = "approved" | "pending" | "credit";
export type Meal = "Breakfast" | "Lunch" | "Snacks" | "Dinner";
export type SessionMeal = "Breakfast" | "Lunch" | "Dinner";
export type ScanRecord = {
  id: string;
  ts: number;
  meal: Meal;
  state: ScanState;
  amount: number;
  balanceAfter: number;
  qr: string;
  reason?: string;
};

export type PaymentType = "recharge" | "credit" | "due";
export type PaymentRecord = {
  id: string;
  ts: number;
  type: PaymentType;
  title: string;
  amount: number; // positive for recharge, negative for credit/due
  status: "Paid" | "Credit" | "Pending";
  method?: string;
};

export type Student = {
  name: string;
  initials: string;
  rollNo: string;
  hostel: string;
  block: string;
  room: string;
  plan: "Veg Premium" | "Veg Basic" | "Non-Veg Premium";
  planEnds: string;
  joined: string;
};

export type Settings = {
  notifications: boolean;
  language: "English" | "हिन्दी" | "தமிழ்" | "తెలుగు";
  weeklyReports: boolean;
  autoCredit: boolean;
};

type Store = {
  hydrated: boolean;
  student: Student;
  balance: number;
  scans: ScanRecord[];
  payments: PaymentRecord[];
  settings: Settings;
  /** Per day attendance map: { 'YYYY-MM-DD': { Breakfast?: scanId, ... } } */
  attendance: Record<string, Partial<Record<SessionMeal, string>>>;
  /** Admin-forced active meal; null = auto from clock */
  activeMealOverride: SessionMeal | null;
  /** Token salt; bumping it invalidates outstanding QR codes */
  tokenSalt: string;
};

const KEY = "mess-store-v3";
export const MEAL_PRICE = 50;

export const MEAL_WINDOWS: Record<SessionMeal, { start: number; end: number }> = {
  Breakfast: { start: 7, end: 10 },
  Lunch: { start: 12, end: 15 },
  Dinner: { start: 19, end: 22 },
};

/** Token format: MESS|<meal>|<YYYY-MM-DD>|<expiryMs>|<salt> */
export const TOKEN_TTL_MS = 30_000;

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function activeMealNow(): SessionMeal | null {
  const h = new Date().getHours();
  for (const m of ["Breakfast", "Lunch", "Dinner"] as SessionMeal[]) {
    const w = MEAL_WINDOWS[m];
    if (h >= w.start && h < w.end) return m;
  }
  return null;
}

export function getActiveMeal(): SessionMeal | null {
  loadOnce();
  return state.activeMealOverride ?? activeMealNow();
}

export function generateQrToken(meal?: SessionMeal | null): string | null {
  loadOnce();
  const m = meal ?? getActiveMeal();
  if (!m) return null;
  const expiry = Date.now() + TOKEN_TTL_MS;
  return `MESS|${m}|${todayKey()}|${expiry}|${state.tokenSalt}`;
}

export type ValidationResult =
  | { ok: true; meal: SessionMeal }
  | { ok: false; reason: string };

export function validateQr(qr: string): ValidationResult {
  loadOnce();
  const parts = qr.split("|");
  if (parts.length !== 5 || parts[0] !== "MESS") {
    return { ok: false, reason: "Invalid QR" };
  }
  const [, meal, day, expiryStr, salt] = parts;
  if (!["Breakfast", "Lunch", "Dinner"].includes(meal)) {
    return { ok: false, reason: "Unknown meal token" };
  }
  if (salt !== state.tokenSalt) return { ok: false, reason: "QR revoked" };
  if (day !== todayKey()) return { ok: false, reason: "QR expired (old day)" };
  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || Date.now() > expiry) {
    return { ok: false, reason: "QR expired" };
  }
  const active = getActiveMeal();
  if (!active) return { ok: false, reason: "No active meal session" };
  if (active !== meal) {
    return { ok: false, reason: `Not ${meal} time` };
  }
  const today = state.attendance[todayKey()] ?? {};
  if (today[meal as SessionMeal]) {
    return { ok: false, reason: "Already taken" };
  }
  return { ok: true, meal: meal as SessionMeal };
}

const DEFAULT_STUDENT: Student = {
  name: "Aarav Reddy",
  initials: "AR",
  rollNo: "21CSE1042",
  hostel: "Sarayu Hostel",
  block: "C",
  room: "C-214",
  plan: "Veg Premium",
  planEnds: "30 Nov 2026",
  joined: "Aug 2024",
};

const DEFAULT_PAYMENTS: PaymentRecord[] = [
  {
    id: "p-001",
    ts: Date.now() - 1000 * 60 * 60 * 24 * 10,
    type: "recharge",
    title: "November Plan",
    amount: 3200,
    status: "Paid",
    method: "UPI · GPay",
  },
  {
    id: "p-002",
    ts: Date.now() - 1000 * 60 * 60 * 24 * 18,
    type: "credit",
    title: "Credit top-up",
    amount: -500,
    status: "Credit",
  },
];

const DEFAULT_SETTINGS: Settings = {
  notifications: true,
  language: "English",
  weeklyReports: true,
  autoCredit: false,
};

const DEFAULT: Store = {
  hydrated: false,
  student: DEFAULT_STUDENT,
  balance: 2480,
  scans: [],
  payments: DEFAULT_PAYMENTS,
  settings: DEFAULT_SETTINGS,
  attendance: {},
  activeMealOverride: null,
  tokenSalt: "s-init",
};

let state: Store = DEFAULT;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}
function persist() {
  if (typeof window === "undefined") return;
  const { hydrated, ...rest } = state;
  void hydrated;
  localStorage.setItem(KEY, JSON.stringify(rest));
}
function loadOnce() {
  if (state.hydrated || typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Store>;
      state = {
        ...DEFAULT,
        ...parsed,
        student: { ...DEFAULT_STUDENT, ...(parsed.student ?? {}) },
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
        hydrated: true,
      };
    } else {
      state = { ...DEFAULT, hydrated: true };
    }
  } catch {
    state = { ...DEFAULT, hydrated: true };
  }
}

export function useMessStore() {
  const snap = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => DEFAULT,
  );
  const [, setReady] = useState(false);
  useEffect(() => {
    if (!state.hydrated) {
      loadOnce();
      setReady(true);
      emit();
    }
  }, []);
  return snap;
}

export function getMealForNow(): Meal {
  const h = new Date().getHours();
  if (h < 10) return "Breakfast";
  if (h < 15) return "Lunch";
  if (h < 18) return "Snacks";
  return "Dinner";
}

export function previewState(): ScanState {
  loadOnce();
  if (state.balance >= MEAL_PRICE) return "approved";
  if (state.balance < 0) return "credit";
  return "pending";
}

export function commitInvalid(qr: string, reason: string): ScanRecord {
  loadOnce();
  const record: ScanRecord = {
    id: crypto.randomUUID(),
    ts: Date.now(),
    meal: getMealForNow(),
    state: "pending",
    amount: 0,
    balanceAfter: state.balance,
    qr,
    reason,
  };
  state = { ...state, scans: [record, ...state.scans].slice(0, 60) };
  persist();
  emit();
  return record;
}

export function commitScan(qr: string, accepted = true, sessionMeal?: SessionMeal): ScanRecord {
  loadOnce();
  const meal: Meal = sessionMeal ?? getMealForNow();
  let scanState: ScanState;
  let amount = 0;

  if (state.balance >= MEAL_PRICE) {
    scanState = "approved";
    amount = MEAL_PRICE;
  } else if (accepted) {
    scanState = "credit";
    amount = MEAL_PRICE;
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
    ...state,
    balance: balanceAfter,
    scans: [record, ...state.scans].slice(0, 60),
  };

  // Mark attendance for today's meal session if approved/credit
  if ((scanState === "approved" || scanState === "credit") && sessionMeal) {
    const day = todayKey();
    state = {
      ...state,
      attendance: {
        ...state.attendance,
        [day]: { ...(state.attendance[day] ?? {}), [sessionMeal]: record.id },
      },
    };
  }

  // Mirror credit usage as a payment log entry
  if (scanState === "credit") {
    state.payments = [
      {
        id: crypto.randomUUID(),
        ts: record.ts,
        type: "credit" as PaymentType,
        title: `${meal} on credit`,
        amount: -amount,
        status: "Credit" as const,
      },
      ...state.payments,
    ].slice(0, 60);
  }

  persist();
  emit();
  return record;
}

export function resetAttendance() {
  loadOnce();
  state = { ...state, attendance: {}, tokenSalt: `s-${Date.now()}` };
  persist();
  emit();
}

export function regenerateSalt() {
  loadOnce();
  state = { ...state, tokenSalt: `s-${Date.now()}` };
  persist();
  emit();
}

export function setActiveMealOverride(meal: SessionMeal | null) {
  loadOnce();
  state = { ...state, activeMealOverride: meal };
  persist();
  emit();
}

export function addPayment(amount: number, method = "UPI · GPay"): PaymentRecord {
  loadOnce();
  const rec: PaymentRecord = {
    id: crypto.randomUUID(),
    ts: Date.now(),
    type: "recharge",
    title: "Wallet recharge",
    amount,
    status: "Paid",
    method,
  };
  state = {
    ...state,
    balance: state.balance + amount,
    payments: [rec, ...state.payments].slice(0, 60),
  };
  persist();
  emit();
  return rec;
}

export function updateSettings(patch: Partial<Settings>) {
  loadOnce();
  state = { ...state, settings: { ...state.settings, ...patch } };
  persist();
  emit();
}

export function resetStore() {
  state = { ...DEFAULT, hydrated: true };
  persist();
  emit();
}

export type Stats = {
  totalScans: number;
  approved: number;
  credit: number;
  declined: number;
  attendancePct: number;
  spent: number;
  creditUsed: number;
};

export function computeStats(scans: ScanRecord[]): Stats {
  const totalScans = scans.length;
  const approved = scans.filter((s) => s.state === "approved").length;
  const credit = scans.filter((s) => s.state === "credit").length;
  const declined = scans.filter((s) => s.state === "pending").length;
  const attended = approved + credit;
  const attendancePct = totalScans
    ? Math.round((attended / totalScans) * 100)
    : 0;
  const spent = scans
    .filter((s) => s.state === "approved")
    .reduce((sum, s) => sum + s.amount, 0);
  const creditUsed = scans
    .filter((s) => s.state === "credit")
    .reduce((sum, s) => sum + s.amount, 0);
  return { totalScans, approved, credit, declined, attendancePct, spent, creditUsed };
}
