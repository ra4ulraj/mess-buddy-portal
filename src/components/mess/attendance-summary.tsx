import { useMemo } from "react";
import { motion } from "framer-motion";
import { Coffee, UtensilsCrossed, Moon, TrendingUp } from "lucide-react";
import { useMessStore, type SessionMeal } from "@/lib/mess-store";
import { SectionHeader } from "./section-card";

const MEAL_META: { key: SessionMeal; label: string; icon: typeof Coffee; tint: string }[] = [
  { key: "Breakfast", label: "Breakfast", icon: Coffee, tint: "var(--gradient-warning)" },
  { key: "Lunch", label: "Lunch", icon: UtensilsCrossed, tint: "var(--gradient-primary)" },
  { key: "Dinner", label: "Dinner", icon: Moon, tint: "var(--gradient-hero)" },
];

function monthBounds(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysSoFar = Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1;
  return { startMs: start.getTime(), daysSoFar };
}

export function AttendanceSummary() {
  const { scans, loading } = useMessStore();

  const stats = useMemo(() => {
    const { startMs, daysSoFar } = monthBounds();
    const monthScans = scans.filter(
      (s) => s.ts >= startMs && (s.state === "approved" || s.state === "credit"),
    );
    const perMeal: Record<SessionMeal, number> = { Breakfast: 0, Lunch: 0, Dinner: 0 };
    for (const s of monthScans) {
      if (s.meal === "Breakfast" || s.meal === "Lunch" || s.meal === "Dinner") {
        perMeal[s.meal] += 1;
      }
    }
    const attended = perMeal.Breakfast + perMeal.Lunch + perMeal.Dinner;
    const total = Math.max(1, daysSoFar * 3);
    const pct = Math.min(100, Math.round((attended / total) * 100));
    return { perMeal, attended, total, pct, daysSoFar };
  }, [scans]);

  const size = 168;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const offset = C - (stats.pct / 100) * C;
  const monthLabel = new Date().toLocaleString(undefined, { month: "long" });

  return (
    <section className="mt-7">
      <SectionHeader
        title="Attendance summary"
        action={
          <span className="text-xs text-muted-foreground">{monthLabel}</span>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-card p-6"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full opacity-40 blur-3xl"
          style={{ background: "var(--gradient-primary)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full opacity-25 blur-3xl"
          style={{ background: "var(--gradient-hero)" }}
        />

        <div className="relative flex flex-col items-center">
          <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
              <defs>
                <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="var(--primary-glow)" />
                </linearGradient>
              </defs>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke="var(--secondary)"
                strokeWidth={stroke}
                fill="none"
              />
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke="url(#ringGrad)"
                strokeWidth={stroke}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={C}
                initial={{ strokeDashoffset: C }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                style={{ filter: "drop-shadow(0 0 8px var(--primary))" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {loading ? "—" : `${stats.pct}%`}
              </span>
              <span className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                this month
              </span>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{stats.attended}</span> of{" "}
            {stats.total} meals attended
          </p>

          <div
            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
            style={{
              background: "color-mix(in oklab, var(--primary) 18%, transparent)",
              color: "var(--primary)",
              border: "1px solid color-mix(in oklab, var(--primary) 40%, transparent)",
            }}
          >
            <TrendingUp className="h-3 w-3" />
            {stats.pct >= 80
              ? "Excellent streak"
              : stats.pct >= 50
                ? "On track"
                : "Needs attention"}
          </div>
        </div>
      </motion.div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        {MEAL_META.map((m, i) => {
          const Icon = m.icon;
          const attended = stats.perMeal[m.key];
          const total = Math.max(1, stats.daysSoFar);
          const pct = Math.min(100, Math.round((attended / total) * 100));
          return (
            <motion.div
              key={m.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 + i * 0.06 }}
              className="relative overflow-hidden rounded-2xl border border-border bg-card p-3.5 backdrop-blur"
              style={{
                boxShadow: "var(--shadow-card)",
                background:
                  "linear-gradient(160deg, color-mix(in oklab, var(--card) 92%, transparent), color-mix(in oklab, var(--card) 75%, transparent))",
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -top-10 -right-6 h-24 w-24 rounded-full opacity-40 blur-2xl"
                style={{ background: m.tint }}
              />
              <div className="relative">
                <span
                  className="grid h-8 w-8 place-items-center rounded-xl text-white"
                  style={{ background: m.tint, boxShadow: "var(--shadow-glow)" }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-2.5 text-[11px] font-medium text-muted-foreground">
                  {m.label}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {attended}
                  <span className="text-muted-foreground">/{total}</span>
                </p>
                <p
                  className="mt-0.5 text-[11px] font-semibold"
                  style={{ color: "var(--primary)" }}
                >
                  {pct}%
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
