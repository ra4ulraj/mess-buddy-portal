import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  XCircle,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { SectionHeader } from "./section-card";
import { useMessStore, type ScanRecord, type ScanState } from "@/lib/mess-store";

const STATE_META: Record<
  ScanState,
  { icon: LucideIcon; label: string; tone: string; dot: string; payLabel: string }
> = {
  approved: {
    icon: CheckCircle2,
    label: "Approved",
    tone: "text-success",
    dot: "var(--success)",
    payLabel: "Paid",
  },
  pending: {
    icon: XCircle,
    label: "Declined",
    tone: "text-destructive",
    dot: "var(--destructive)",
    payLabel: "Unpaid",
  },
  credit: {
    icon: Clock,
    label: "On credit",
    tone: "text-warning",
    dot: "var(--warning)",
    payLabel: "On credit",
  },
};

type Filter = "today" | "week" | "month";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
];

function startOf(filter: Filter): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (filter === "today") return d.getTime();
  if (filter === "week") {
    const day = d.getDay(); // 0=Sun
    const diff = (day + 6) % 7; // week starts Monday
    d.setDate(d.getDate() - diff);
    return d.getTime();
  }
  d.setDate(1);
  return d.getTime();
}

function timeFmt(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayLabel(key: string): string {
  const d = new Date(key);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = d.getTime();
  if (t === today.getTime()) return "Today";
  const yest = today.getTime() - 86400_000;
  if (t === yest) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function AttendanceHistory() {
  const { scans, loading } = useMessStore();
  const [filter, setFilter] = useState<Filter>("today");

  const filtered = useMemo(() => {
    const since = startOf(filter);
    return scans.filter((s) => s.ts >= since);
  }, [scans, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, ScanRecord[]>();
    for (const s of filtered) {
      const key = dayKey(s.ts);
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  return (
    <section className="mt-7">
      <SectionHeader
        title="Attendance history"
        action={
          <span className="text-xs text-muted-foreground">
            {filtered.length} scan{filtered.length === 1 ? "" : "s"}
          </span>
        }
      />

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="shrink-0 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold transition active:scale-[0.97]"
              style={
                active
                  ? {
                      background: "var(--gradient-primary)",
                      color: "var(--primary-foreground)",
                      borderColor: "transparent",
                    }
                  : { background: "var(--secondary)", color: "var(--foreground)" }
              }
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {grouped.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-dashed border-border bg-card p-8 text-center"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <span
              className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl"
              style={{
                background: "color-mix(in oklab, var(--primary) 14%, transparent)",
                color: "var(--primary)",
              }}
            >
              <CalendarDays className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold text-foreground">
              {loading ? "Loading attendance…" : "No scans in this range"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {loading
                ? "Syncing with the server."
                : "Try a wider window or scan a meal QR."}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={filter}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {grouped.map(([key, items]) => (
              <div key={key}>
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--primary)" }}
                  />
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {dayLabel(key)}
                  </p>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {items.length} meal{items.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="relative pl-5">
                  <span
                    aria-hidden
                    className="absolute left-[7px] top-1 bottom-1 w-px"
                    style={{
                      background:
                        "linear-gradient(to bottom, color-mix(in oklab, var(--primary) 60%, transparent), transparent)",
                    }}
                  />
                  <div className="space-y-2.5">
                    {items.map((s, i) => {
                      const meta = STATE_META[s.state];
                      const Icon = meta.icon;
                      return (
                        <motion.div
                          key={s.id}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.25, delay: i * 0.03 }}
                          className="relative"
                        >
                          <span
                            aria-hidden
                            className="absolute -left-[18px] top-4 h-2.5 w-2.5 rounded-full ring-4"
                            style={{
                              background: meta.dot,
                              boxShadow: `0 0 10px ${meta.dot}`,
                              ["--tw-ring-color" as string]: "var(--background)",
                            }}
                          />
                          <div
                            className="flex items-center justify-between rounded-2xl border border-border bg-card px-3.5 py-3"
                            style={{ boxShadow: "var(--shadow-card)" }}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`grid h-9 w-9 place-items-center rounded-xl bg-secondary ${meta.tone}`}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  {s.meal}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {timeFmt(s.ts)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-foreground">
                                {s.amount > 0 ? `-₹${s.amount}` : "—"}
                              </p>
                              <div className="mt-0.5 flex items-center justify-end gap-1.5">
                                <span
                                  className={`text-[10px] font-medium ${meta.tone}`}
                                >
                                  {meta.label}
                                </span>
                                <span
                                  className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                                  style={{
                                    background:
                                      "color-mix(in oklab, " +
                                      meta.dot +
                                      " 18%, transparent)",
                                    color: meta.dot,
                                  }}
                                >
                                  {meta.payLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
