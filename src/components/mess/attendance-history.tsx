import { useMemo, useState } from "react";
import { CheckCircle2, Clock, XCircle, type LucideIcon } from "lucide-react";
import { SectionHeader } from "./section-card";
import { useMessStore, type ScanRecord, type ScanState } from "@/lib/mess-store";

const STATE_META: Record<
  ScanState,
  { icon: LucideIcon; label: string; tone: string }
> = {
  approved: { icon: CheckCircle2, label: "Approved", tone: "text-success" },
  pending: { icon: XCircle, label: "Declined", tone: "text-destructive" },
  credit: { icon: Clock, label: "On credit", tone: "text-warning-foreground" },
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

      {grouped.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed border-border bg-card p-6 text-center"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <p className="text-sm font-medium text-foreground">
            {loading ? "Loading attendance…" : "No scans in this range"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {loading
              ? "Syncing with the server."
              : "Try a wider window or scan a meal QR."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([key, items]) => (
            <div key={key}>
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {dayLabel(key)}
              </p>
              <div
                className="overflow-hidden rounded-2xl border border-border bg-card"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                {items.map((s, i) => {
                  const meta = STATE_META[s.state];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between px-4 py-3 ${
                        i !== items.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`grid h-9 w-9 place-items-center rounded-xl bg-secondary ${meta.tone}`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground">
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
                        <p className={`text-[10px] font-medium ${meta.tone}`}>
                          {meta.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
