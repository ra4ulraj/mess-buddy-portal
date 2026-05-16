import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  MEAL_WINDOWS,
  activeMealNow,
  todayKey,
  type SessionMeal,
} from "./mess-store";

export type NotificationKind = "meal" | "due" | "admin" | "system";
export type NotificationRecord = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  ts: number;
};

type DbRow = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

type Store = {
  hydrated: boolean;
  loading: boolean;
  items: NotificationRecord[];
  error: string | null;
};

const DEFAULT: Store = {
  hydrated: false,
  loading: false,
  items: [],
  error: null,
};

let state: Store = DEFAULT;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function setState(patch: Partial<Store>) {
  state = { ...state, ...patch };
  emit();
}

function rowToRecord(r: DbRow): NotificationRecord {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body,
    link: r.link,
    read: r.read,
    ts: new Date(r.created_at).getTime(),
  };
}

let currentUserId: string | null = null;
let channel: ReturnType<typeof supabase.channel> | null = null;

async function load(userId: string) {
  setState({ loading: true, error: null });
  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, title, body, link, read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) {
    setState({ loading: false, hydrated: true, error: error.message });
    return;
  }
  setState({
    loading: false,
    hydrated: true,
    items: (data ?? []).map((r) => rowToRecord(r as DbRow)),
  });
}

export async function syncNotifications(userId: string | null) {
  if (channel) {
    await supabase.removeChannel(channel);
    channel = null;
  }
  currentUserId = userId;
  if (!userId) {
    setState({ ...DEFAULT, hydrated: true });
    return;
  }
  await load(userId);
  channel = supabase
    .channel(`notif-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      () => void load(userId),
    )
    .subscribe();
}

export async function pushNotification(
  input: Omit<NotificationRecord, "id" | "ts" | "read"> & { read?: boolean },
) {
  if (!currentUserId) return;
  const { error } = await supabase.from("notifications").insert({
    user_id: currentUserId,
    kind: input.kind,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
    read: input.read ?? false,
  });
  if (error) console.warn("notif insert failed", error.message);
}

export async function markRead(id: string) {
  setState({
    items: state.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
  });
  await supabase.from("notifications").update({ read: true }).eq("id", id);
}

export async function markAllRead() {
  if (!currentUserId) return;
  const unread = state.items.filter((n) => !n.read).map((n) => n.id);
  if (unread.length === 0) return;
  setState({ items: state.items.map((n) => ({ ...n, read: true })) });
  await supabase
    .from("notifications")
    .update({ read: true })
    .in("id", unread);
}

export function useNotificationsStore() {
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
    force((n) => n + 1);
  }, []);
  return snap;
}

export function unreadCount(items: NotificationRecord[]) {
  return items.filter((n) => !n.read).length;
}

// ---------- Auto reminders ----------

const sentMealKeys = new Set<string>();
let lastDueAlertTs = 0;

function ensureMealReminder(meal: SessionMeal, attendance: Record<string, Partial<Record<SessionMeal, string>>>) {
  const day = todayKey();
  const key = `${day}-${meal}`;
  if (sentMealKeys.has(key)) return;
  if (attendance[day]?.[meal]) {
    sentMealKeys.add(key);
    return;
  }
  // already exists in items?
  const exists = state.items.some(
    (n) =>
      n.kind === "meal" &&
      n.title.includes(meal) &&
      todayKey(new Date(n.ts)) === day,
  );
  if (exists) {
    sentMealKeys.add(key);
    return;
  }
  sentMealKeys.add(key);
  const w = MEAL_WINDOWS[meal];
  void pushNotification({
    kind: "meal",
    title: `${meal} is being served`,
    body: `Scan the QR before ${w.end}:00 to avoid using credit.`,
    link: "/",
  });
}

function ensureDueAlert(balance: number) {
  if (balance >= 0) return;
  if (Date.now() - lastDueAlertTs < 6 * 60 * 60 * 1000) return;
  const recent = state.items.find(
    (n) => n.kind === "due" && Date.now() - n.ts < 6 * 60 * 60 * 1000,
  );
  if (recent) {
    lastDueAlertTs = recent.ts;
    return;
  }
  lastDueAlertTs = Date.now();
  void pushNotification({
    kind: "due",
    title: "Pending dues on your wallet",
    body: `You owe ₹${Math.abs(balance).toFixed(0)}. Recharge to clear credit.`,
    link: "/wallet",
  });
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
export function startNotificationDaemon() {
  if (pollTimer || typeof window === "undefined") return;
  pollTimer = setInterval(() => {
    if (!currentUserId || !state.hydrated) return;
    const mess = currentMess();
    if (!mess) return;
    const meal = activeMealNow();
    if (meal) ensureMealReminder(meal, mess.attendance);
    ensureDueAlert(mess.balance);
  }, 30_000);
}

// Lightweight accessor that avoids importing the hook itself in a non-component
type MessSnapshot = {
  balance: number;
  attendance: Record<string, Partial<Record<SessionMeal, string>>>;
};
let messReader: (() => MessSnapshot) | null = null;
export function registerMessReader(fn: () => MessSnapshot) {
  messReader = fn;
}
function currentMess(): MessSnapshot | null {
  try {
    return messReader ? messReader() : null;
  } catch {
    return null;
  }
}