import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "./auth-store";

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
  amount: number;
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
  loading: boolean;
  error: string | null;
  student: Student;
  balance: number;
  scans: ScanRecord[];
  payments: PaymentRecord[];
  settings: Settings;
  attendance: Record<string, Partial<Record<SessionMeal, string>>>;
  activeMealOverride: SessionMeal | null;
  tokenSalt: string;
};

export const MEAL_PRICE = 50;
export const MEAL_WINDOWS: Record<SessionMeal, { start: number; end: number }> = {
  Breakfast: { start: 7, end: 10 },
  Lunch: { start: 12, end: 15 },
  Dinner: { start: 19, end: 22 },
};
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
  return state.activeMealOverride ?? activeMealNow();
}
export function generateQrToken(meal?: SessionMeal | null): string | null {
  const m = meal ?? getActiveMeal();
  if (!m) return null;
  return `MESS|${m}|${todayKey()}|${Date.now() + TOKEN_TTL_MS}|${state.tokenSalt}`;
}
export type ValidationResult =
  | { ok: true; meal: SessionMeal }
  | { ok: false; reason: string };
export function validateQr(qr: string): ValidationResult {
  const parts = qr.split("|");
  if (parts.length !== 5 || parts[0] !== "MESS")
    return { ok: false, reason: "Invalid QR" };
  const [, meal, day, expiryStr, salt] = parts;
  if (!["Breakfast", "Lunch", "Dinner"].includes(meal))
    return { ok: false, reason: "Unknown meal token" };
  if (salt !== state.tokenSalt) return { ok: false, reason: "QR revoked" };
  if (day !== todayKey()) return { ok: false, reason: "QR expired (old day)" };
  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || Date.now() > expiry)
    return { ok: false, reason: "QR expired" };
  const active = getActiveMeal();
  if (!active) return { ok: false, reason: "No active meal session" };
  if (active !== meal) return { ok: false, reason: `Not ${meal} time` };
  const today = state.attendance[todayKey()] ?? {};
  if (today[meal as SessionMeal]) return { ok: false, reason: "Already taken" };
  return { ok: true, meal: meal as SessionMeal };
}
export function getMealForNow(): Meal {
  const h = new Date().getHours();
  if (h < 10) return "Breakfast";
  if (h < 15) return "Lunch";
  if (h < 18) return "Snacks";
  return "Dinner";
}
function toDbMeal(m: Meal): SessionMeal {
  if (m === "Snacks") return "Lunch";
  return m;
}
function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const DEFAULT_STUDENT: Student = {
  name: "Student",
  initials: "S",
  rollNo: "—",
  hostel: "Sarayu Hostel",
  block: "C",
  room: "C-214",
  plan: "Veg Premium",
  planEnds: "—",
  joined: "—",
};
const DEFAULT_SETTINGS: Settings = {
  notifications: true,
  language: "English",
  weeklyReports: true,
  autoCredit: false,
};
const DEFAULT: Store = {
  hydrated: false,
  loading: false,
  error: null,
  student: DEFAULT_STUDENT,
  balance: 0,
  scans: [],
  payments: [],
  settings: DEFAULT_SETTINGS,
  attendance: {},
  activeMealOverride: null,
  tokenSalt: "s-init",
};

let state: Store = DEFAULT;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function setState(patch: Partial<Store>) {
  state = { ...state, ...patch };
  emit();
}

type DbAttendance = {
  id: string;
  meal_type: SessionMeal;
  status: "approved" | "credit" | "invalid";
  amount: number;
  balance_after: number | null;
  reason: string | null;
  scanned_at: string;
};

type DbPayment = {
  id: string;
  amount: number;
  method: string | null;
  payment_type: PaymentType;
  status: PaymentRecord["status"];
  title: string;
  created_at: string;
};

function rowToScan(r: DbAttendance): ScanRecord {
  return {
    id: r.id,
    ts: new Date(r.scanned_at).getTime(),
    meal: r.meal_type,
    state: r.status === "invalid" ? "pending" : (r.status as ScanState),
    amount: Number(r.amount ?? 0),
    balanceAfter: Number(r.balance_after ?? 0),
    qr: "",
    reason: r.reason ?? undefined,
  };
}

function rowToPayment(r: DbPayment): PaymentRecord {
  return {
    id: r.id,
    ts: new Date(r.created_at).getTime(),
    type: r.payment_type,
    title: r.title,
    amount: Number(r.amount ?? 0),
    status: r.status,
    method: r.method ?? undefined,
  };
}

function rebuildAttendance(scans: ScanRecord[]) {
  const map: Record<string, Partial<Record<SessionMeal, string>>> = {};
  for (const s of scans) {
    if (s.state === "pending") continue;
    if (!["Breakfast", "Lunch", "Dinner"].includes(s.meal)) continue;
    const day = todayKey(new Date(s.ts));
    if (!map[day]) map[day] = {};
    if (!map[day][s.meal as SessionMeal]) map[day][s.meal as SessionMeal] = s.id;
  }
  return map;
}

let currentUserId: string | null = null;
let attendanceChannel: ReturnType<typeof supabase.channel> | null = null;
let profileChannel: ReturnType<typeof supabase.channel> | null = null;
let paymentChannel: ReturnType<typeof supabase.channel> | null = null;

async function loadProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return;
  const student: Student = {
    name: data.name,
    initials: initials(data.name),
    rollNo: data.roll_number ?? "—",
    hostel: data.hostel,
    block: data.block,
    room: data.room,
    plan: (data.meal_plan as Student["plan"]) ?? "Veg Premium",
    planEnds: data.plan_ends
      ? new Date(data.plan_ends).toLocaleDateString(undefined, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—",
    joined: data.created_at
      ? new Date(data.created_at).toLocaleDateString(undefined, {
          month: "short",
          year: "numeric",
        })
      : "—",
  };
  setState({ student, balance: Number(data.balance ?? 0) });
}

async function loadAttendance(userId: string) {
  const { data, error } = await supabase
    .from("attendance")
    .select("id, meal_type, status, amount, balance_after, reason, scanned_at")
    .eq("student_id", userId)
    .order("scanned_at", { ascending: false })
    .limit(90);
  if (error) throw error;
  const scans = (data ?? []).map((r) => rowToScan(r as DbAttendance));
  setState({ scans, attendance: rebuildAttendance(scans) });
}

async function loadPayments(userId: string) {
  const { data, error } = await supabase
    .from("payments")
    .select("id, amount, method, payment_type, status, title, created_at")
    .eq("student_id", userId)
    .order("created_at", { ascending: false })
    .limit(90);
  if (error) {
    console.warn("payment load failed", error.message);
    return;
  }
  setState({ payments: (data ?? []).map((r) => rowToPayment(r as DbPayment)) });
}

async function removeRealtimeChannels() {
  await Promise.all(
    [attendanceChannel, profileChannel, paymentChannel]
      .filter(Boolean)
      .map((channel) => supabase.removeChannel(channel!)),
  );
  attendanceChannel = null;
  profileChannel = null;
  paymentChannel = null;
}

export async function syncForUser(userId: string | null) {
  await removeRealtimeChannels();
  currentUserId = userId;
  if (!userId) {
    setState({
      student: DEFAULT_STUDENT,
      balance: 0,
      scans: [],
      payments: [],
      attendance: {},
      hydrated: true,
      loading: false,
      error: null,
    });
    return;
  }
  setState({ loading: true, error: null });
  try {
    await Promise.all([loadProfile(userId), loadAttendance(userId), loadPayments(userId)]);
    setState({ hydrated: true, loading: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load data";
    setState({ hydrated: true, loading: false, error: msg });
  }

  profileChannel = supabase
    .channel(`profile-${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
      () => void loadProfile(userId).catch(() => undefined),
    )
    .subscribe();

  attendanceChannel = supabase
    .channel(`attendance-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "attendance",
        filter: `student_id=eq.${userId}`,
      },
      () => void loadAttendance(userId).catch(() => undefined),
    )
    .subscribe();

  paymentChannel = supabase
    .channel(`payments-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "payments",
        filter: `student_id=eq.${userId}`,
      },
      () => void loadPayments(userId).catch(() => undefined),
    )
    .subscribe();
}

let initOnce = false;
function ensureInit() {
  if (initOnce || typeof window === "undefined") return;
  initOnce = true;
  state = { ...state, hydrated: true };
  emit();
}

export function useMessStore() {
  const snap = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
  const [, force] = useState(0);
  useEffect(() => {
    ensureInit();
    force((n) => n + 1);
  }, []);
  return snap;
}

export function previewState(): ScanState {
  if (state.balance >= MEAL_PRICE) return "approved";
  if (state.balance < 0) return "credit";
  return "pending";
}

export async function commitInvalid(qr: string, reason: string): Promise<ScanRecord> {
  const userId = currentUserId ?? getCurrentUser()?.id;
  const meal = toDbMeal(getMealForNow());
  if (userId) {
    try {
      const { data } = await supabase
        .from("attendance")
        .insert({
          student_id: userId,
          meal_type: meal,
          status: "invalid",
          amount: 0,
          balance_after: state.balance,
          reason,
        })
        .select("id, meal_type, status, amount, balance_after, reason, scanned_at")
        .single();
      if (data) {
        const rec = rowToScan(data as DbAttendance);
        rec.qr = qr;
        return rec;
      }
    } catch {
      /* fallthrough to local */
    }
  }
  return {
    id: crypto.randomUUID(),
    ts: Date.now(),
    meal,
    state: "pending",
    amount: 0,
    balanceAfter: state.balance,
    qr,
    reason,
  };
}

async function insertPayment(input: Omit<DbPayment, "id" | "created_at"> & { student_id: string }) {
  const { error } = await supabase.from("payments").insert(input);
  if (error) console.warn("payment insert failed", error.message);
}

export async function commitScan(
  qr: string,
  accepted = true,
  sessionMeal?: SessionMeal,
): Promise<ScanRecord> {
  const userId = currentUserId ?? getCurrentUser()?.id;
  const meal: SessionMeal = sessionMeal ?? toDbMeal(getMealForNow());
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

  if (!userId) {
    return {
      id: crypto.randomUUID(),
      ts: Date.now(),
      meal,
      state: scanState,
      amount,
      balanceAfter,
      qr,
    };
  }

  if (scanState === "pending") {
    return {
      id: crypto.randomUUID(),
      ts: Date.now(),
      meal,
      state: "pending",
      amount: 0,
      balanceAfter: state.balance,
      qr,
    };
  }

  const { data: ins, error: insErr } = await supabase
    .from("attendance")
    .insert({
      student_id: userId,
      meal_type: meal,
      status: scanState,
      amount,
      balance_after: balanceAfter,
    })
    .select("id, meal_type, status, amount, balance_after, reason, scanned_at")
    .single();
  if (insErr) throw new Error(insErr.message);

  const { error: upErr } = await supabase
    .from("profiles")
    .update({ balance: balanceAfter })
    .eq("id", userId);
  if (upErr) throw new Error(upErr.message);

  if (scanState === "credit") {
    await insertPayment({
      student_id: userId,
      payment_type: "credit",
      title: `${meal} on credit`,
      amount: -amount,
      status: "Credit",
      method: null,
    });
  }

  const rec = rowToScan(ins as DbAttendance);
  rec.qr = qr;
  setState({ balance: balanceAfter });
  void loadAttendance(userId);
  void loadPayments(userId);
  return rec;
}

export function resetAttendance() {
  setState({ tokenSalt: `s-${Date.now()}` });
}
export function regenerateSalt() {
  setState({ tokenSalt: `s-${Date.now()}` });
}
export function setActiveMealOverride(meal: SessionMeal | null) {
  setState({ activeMealOverride: meal });
}
export async function addPayment(amount: number, method = "UPI · GPay"): Promise<PaymentRecord> {
  const userId = currentUserId ?? getCurrentUser()?.id;
  const rec: PaymentRecord = {
    id: crypto.randomUUID(),
    ts: Date.now(),
    type: "recharge",
    title: "Wallet recharge",
    amount,
    status: "Paid",
    method,
  };
  if (userId) {
    const newBalance = state.balance + amount;
    await insertPayment({
      student_id: userId,
      payment_type: "recharge",
      title: "Wallet recharge",
      amount,
      status: "Paid",
      method,
    });
    const { error } = await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    setState({ balance: newBalance });
    void loadPayments(userId);
  } else {
    setState({ payments: [rec, ...state.payments].slice(0, 60) });
  }
  return rec;
}
export function updateSettings(patch: Partial<Settings>) {
  setState({ settings: { ...state.settings, ...patch } });
}
export function resetStore() {
  state = { ...DEFAULT, hydrated: true, settings: DEFAULT_SETTINGS };
  emit();
  if (currentUserId) void syncForUser(currentUserId);
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
  const attendancePct = totalScans ? Math.round((attended / totalScans) * 100) : 0;
  const spent = scans
    .filter((s) => s.state === "approved")
    .reduce((sum, s) => sum + s.amount, 0);
  const creditUsed = scans
    .filter((s) => s.state === "credit")
    .reduce((sum, s) => sum + s.amount, 0);
  return { totalScans, approved, credit, declined, attendancePct, spent, creditUsed };
}
