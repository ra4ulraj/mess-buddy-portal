import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  Activity,
  BarChart3,
  CircleDollarSign,
  Coffee,
  Moon,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  Users,
  Utensils,
  Wallet,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  getActiveMeal,
  publishQrSession,
  MEAL_WINDOWS,
  setActiveMealOverride,
  todayKey,
  useMessStore,
  type SessionMeal,
} from "@/lib/mess-store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — MessMate Live Hostel Mess Analytics" },
      {
        name: "description",
        content:
          "MessMate live admin dashboard — realtime attendance feed, meals served, pending dues, payment analytics, QR session controls, and student search.",
      },
      { property: "og:title", content: "Admin Dashboard — MessMate" },
      {
        property: "og:description",
        content:
          "Realtime hostel mess analytics: meals served, pending dues, revenue, live QR control and student search.",
      },
      { property: "og:url", content: "/admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "/admin" }],
  }),
  component: AdminPage,
});

const MEALS: SessionMeal[] = ["Breakfast", "Lunch", "Dinner"];
const MEAL_ICONS: Record<SessionMeal, typeof Coffee> = {
  Breakfast: Sun,
  Lunch: Utensils,
  Dinner: Moon,
};

type ProfileRow = {
  id: string;
  name: string;
  roll_number: string | null;
  hostel: string;
  block: string;
  room: string;
  balance: number;
};

type AttendanceRow = {
  id: string;
  student_id: string;
  meal_type: SessionMeal;
  status: "approved" | "credit" | "invalid";
  amount: number;
  scanned_at: string;
  scanned_date: string;
};

type PaymentRow = {
  id: string;
  student_id: string;
  title: string;
  amount: number;
  status: "Paid" | "Credit" | "Pending";
  payment_type: "recharge" | "credit" | "due";
  created_at: string;
};

type Analytics = {
  profiles: ProfileRow[];
  attendance: AttendanceRow[];
  payments: PaymentRow[];
};

const EMPTY: Analytics = { profiles: [], attendance: [], payments: [] };

function AdminPage() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <NeonBackdrop />
      <AdminBody />
    </div>
  );
}

function NeonBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
      <div
        className="absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--gradient-primary)" }}
      />
      <div
        className="absolute -right-24 top-1/3 h-80 w-80 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--gradient-success)" }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full opacity-10 blur-3xl"
        style={{ background: "var(--gradient-hero)" }}
      />
    </div>
  );
}

function AdminBody() {
  const store = useMessStore();
  const { data, loading, error } = useAdminAnalytics();
  const active = getActiveMeal();

  const today = todayKey();
  const todayAttendance = useMemo(
    () => data.attendance.filter((r) => r.scanned_date === today && r.status !== "invalid"),
    [data.attendance, today],
  );
  const profileMap = useMemo(() => {
    const m = new Map<string, ProfileRow>();
    for (const p of data.profiles) m.set(p.id, p);
    return m;
  }, [data.profiles]);

  const totalDues = data.profiles.reduce(
    (s, p) => s + Math.max(0, -Number(p.balance ?? 0)),
    0,
  );
  const monthStart = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const monthRevenue = data.payments
    .filter((p) => p.status === "Paid" && new Date(p.created_at).getTime() >= monthStart)
    .reduce((s, p) => s + Math.max(0, Number(p.amount ?? 0)), 0);
  const todayRevenue = data.payments
    .filter(
      (p) =>
        p.status === "Paid" &&
        new Date(p.created_at).toISOString().slice(0, 10) === today,
    )
    .reduce((s, p) => s + Math.max(0, Number(p.amount ?? 0)), 0);

  const mealCounts: Record<SessionMeal, number> = {
    Breakfast: 0,
    Lunch: 0,
    Dinner: 0,
  };
  for (const r of todayAttendance) if (r.meal_type in mealCounts) mealCounts[r.meal_type]++;

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
      <Header />

      {error && (
        <div className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total students"
          value={data.profiles.length}
          accent="from-emerald-400/20 to-teal-500/10"
          loading={loading}
        />
        <StatCard
          icon={Utensils}
          label="Meals served today"
          value={todayAttendance.length}
          accent="from-lime-400/20 to-emerald-500/10"
          loading={loading}
        />
        <StatCard
          icon={CircleDollarSign}
          label="Pending dues"
          value={totalDues}
          prefix="₹"
          danger
          accent="from-rose-400/20 to-orange-500/10"
          loading={loading}
        />
        <StatCard
          icon={TrendingUp}
          label="Revenue · today"
          value={todayRevenue}
          prefix="₹"
          accent="from-cyan-400/20 to-emerald-500/10"
          loading={loading}
          sub={`₹${monthRevenue.toLocaleString()} this month`}
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        {MEALS.map((m) => {
          const Icon = MEAL_ICONS[m];
          const count = mealCounts[m];
          const total = data.profiles.length;
          const pct = total ? Math.round((count / total) * 100) : 0;
          const isActive = active === m;
          return (
            <GlassCard key={m} className="overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-11 w-11 place-items-center rounded-2xl"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    <Icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      {m}
                    </p>
                    <p className="text-2xl font-bold tabular-nums">
                      <AnimatedNumber value={count} />
                      <span className="text-sm text-muted-foreground"> / {total || "—"}</span>
                    </p>
                  </div>
                </div>
                {isActive && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                    LIVE
                  </span>
                )}
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "var(--gradient-primary)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {pct}% of students · {MEAL_WINDOWS[m].start}:00–{MEAL_WINDOWS[m].end}:00
              </p>
            </GlassCard>
          );
        })}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartsPanel attendance={data.attendance} payments={data.payments} loading={loading} />
        </div>
        <div className="space-y-4">
          <QRPanel
            active={active}
            override={store.activeMealOverride}
            onOverride={(m) => {
              setActiveMealOverride(m);
              toast(m ? `Switched to ${m}` : "Auto mode", {
                description: m
                  ? `${MEAL_WINDOWS[m].start}:00 – ${MEAL_WINDOWS[m].end}:00`
                  : "Session follows clock.",
              });
            }}
          />
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LiveFeed attendance={data.attendance} profiles={profileMap} loading={loading} />
        </div>
        <div className="space-y-4">
          <RecentPayments payments={data.payments} profiles={profileMap} />
        </div>
      </section>

      <section className="mt-6">
        <StudentSearch profiles={data.profiles} attendance={data.attendance} />
      </section>
    </div>
  );
}

function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-3">
        <div
          className="grid h-12 w-12 place-items-center rounded-2xl text-primary-foreground"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Admin Console
          </p>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            Live Mess Dashboard
          </h1>
        </div>
      </div>
      <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur sm:inline-flex">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/15">
          <Activity className="h-3 w-3 text-primary" />
        </span>
        Realtime sync · Supabase
      </div>
    </motion.header>
  );
}

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-3xl border border-white/10 bg-card/50 p-5 backdrop-blur-xl ${className}`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {children}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  prefix = "",
  sub,
  accent = "from-primary/20 to-primary/5",
  danger = false,
  loading = false,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  prefix?: string;
  sub?: string;
  accent?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-card/50 p-4 backdrop-blur-xl sm:p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent}`} />
      <div className="relative flex items-center justify-between">
        <div
          className={`grid h-10 w-10 place-items-center rounded-2xl ${
            danger ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          <span
            className={`h-1.5 w-1.5 animate-pulse rounded-full ${
              danger ? "bg-destructive" : "bg-primary"
            }`}
          />
          live
        </span>
      </div>
      <p className="relative mt-4 text-2xl font-bold tabular-nums sm:text-3xl">
        {loading ? (
          <span className="inline-block h-7 w-20 animate-pulse rounded-md bg-secondary" />
        ) : (
          <>
            {prefix}
            <AnimatedNumber value={value} />
          </>
        )}
      </p>
      <p className="relative mt-1 text-[11px] text-muted-foreground">{label}</p>
      {sub && <p className="relative mt-0.5 text-[10px] text-muted-foreground/70">{sub}</p>}
    </motion.div>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const [n, setN] = useState(value);
  useEffect(() => {
    const start = n;
    const diff = value - start;
    if (diff === 0) return;
    const dur = 600;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(start + diff * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span>{n.toLocaleString()}</span>;
}

function ChartsPanel({
  attendance,
  payments,
  loading,
}: {
  attendance: AttendanceRow[];
  payments: PaymentRow[];
  loading: boolean;
}) {
  const [tab, setTab] = useState<"attendance" | "payments">("attendance");

  const attendanceData = useMemo(() => {
    const days: { day: string; date: string; Breakfast: number; Lunch: number; Dinner: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = todayKey(d);
      days.push({
        day: d.toLocaleDateString(undefined, { weekday: "short" }),
        date: key,
        Breakfast: 0,
        Lunch: 0,
        Dinner: 0,
      });
    }
    const idx = new Map(days.map((d, i) => [d.date, i]));
    for (const r of attendance) {
      if (r.status === "invalid") continue;
      const i = idx.get(r.scanned_date);
      if (i === undefined) continue;
      const row = days[i] as unknown as Record<string, number>;
      if (r.meal_type === "Breakfast" || r.meal_type === "Lunch" || r.meal_type === "Dinner") {
        row[r.meal_type] = (row[r.meal_type] ?? 0) + 1;
      }
    }
    return days;
  }, [attendance]);

  const paymentsData = useMemo(() => {
    const days: { day: string; date: string; revenue: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        day: d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
        date: todayKey(d),
        revenue: 0,
      });
    }
    const idx = new Map(days.map((d, i) => [d.date, i]));
    for (const p of payments) {
      if (p.status !== "Paid") continue;
      const k = new Date(p.created_at).toISOString().slice(0, 10);
      const i = idx.get(k);
      if (i !== undefined) days[i].revenue += Math.max(0, Number(p.amount ?? 0));
    }
    return days;
  }, [payments]);

  return (
    <GlassCard className="h-full">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Analytics</h2>
        </div>
        <div className="inline-flex rounded-full border border-white/10 bg-secondary/40 p-0.5 text-[11px]">
          {(["attendance", "payments"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-full px-3 py-1 font-medium transition ${
                tab === k
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {k === "attendance" ? "7-day attendance" : "14-day revenue"}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 h-72">
        {loading ? (
          <div className="grid h-full place-items-center text-xs text-muted-foreground">
            Loading…
          </div>
        ) : tab === "attendance" ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attendanceData} barCategoryGap={8}>
              <defs>
                <linearGradient id="bGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.16 170)" />
                  <stop offset="100%" stopColor="oklch(0.55 0.18 160)" />
                </linearGradient>
                <linearGradient id="lGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.7 0.17 165)" />
                  <stop offset="100%" stopColor="oklch(0.45 0.15 165)" />
                </linearGradient>
                <linearGradient id="dGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.6 0.18 155)" />
                  <stop offset="100%" stopColor="oklch(0.35 0.12 155)" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                contentStyle={{
                  background: "rgba(10,10,15,0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="Breakfast" fill="url(#bGrad)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Lunch" fill="url(#lGrad)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Dinner" fill="url(#dGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={paymentsData}>
              <defs>
                <linearGradient id="rGrad" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="oklch(0.78 0.16 170)" />
                  <stop offset="100%" stopColor="oklch(0.55 0.18 160)" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "rgba(10,10,15,0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(v) => [`₹${Number(v).toLocaleString()}`, "Revenue"]}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="url(#rGrad)"
                strokeWidth={3}
                dot={{ r: 3, fill: "oklch(0.78 0.16 170)" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </GlassCard>
  );
}

function QRPanel({
  active,
  override,
  onOverride,
}: {
  active: SessionMeal | null;
  override: SessionMeal | null;
  onOverride: (m: SessionMeal | null) => void;
}) {
  const [session, setSession] = useState<{ token: string; expiresAt: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  async function issue() {
    if (!active) {
      setSession(null);
      return;
    }
    setIssuing(true);
    try {
      const s = await publishQrSession(active);
      setSession(s);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not publish QR");
    } finally {
      setIssuing(false);
    }
  }

  useEffect(() => {
    void issue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (!session || !active) return;
    if (session.expiresAt - now <= 0) void issue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, session?.expiresAt, active]);

  const remaining = session ? Math.max(0, Math.ceil((session.expiresAt - now) / 1000)) : 0;
  const pct = session ? Math.max(0, Math.min(100, ((session.expiresAt - now) / 30000) * 100)) : 0;

  return (
    <GlassCard>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Live QR session</h2>
        </div>
        <button
          disabled={!active || issuing}
          onClick={() => void issue()}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-secondary/60 px-3 py-1.5 text-[11px] font-semibold transition active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${issuing ? "animate-spin" : ""}`} />
          New QR
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => onOverride(null)}
          className={`rounded-xl border px-3 py-2 text-[11px] font-semibold transition active:scale-95 ${
            override === null
              ? "border-primary/50 bg-primary/15 text-primary"
              : "border-white/10 bg-secondary/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          Auto · {active ?? "Closed"}
        </button>
        {MEALS.map((m) => (
          <button
            key={m}
            onClick={() => onOverride(m)}
            className={`rounded-xl border px-3 py-2 text-[11px] font-semibold transition active:scale-95 ${
              override === m
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-white/10 bg-secondary/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="mt-4 grid place-items-center">
        {session && active ? (
          <motion.div
            key={session.token}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-2xl bg-white p-3"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            <QRCodeSVG value={session.token} size={180} level="M" />
          </motion.div>
        ) : (
          <div className="grid h-44 w-44 place-items-center rounded-2xl border border-dashed border-white/10 text-center text-xs text-muted-foreground">
            No active meal session
          </div>
        )}
      </div>

      {session && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Rotates in {remaining}s</span>
            <span>{active}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${pct}%`, background: "var(--gradient-primary)" }}
            />
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function LiveFeed({
  attendance,
  profiles,
  loading,
}: {
  attendance: AttendanceRow[];
  profiles: Map<string, ProfileRow>;
  loading: boolean;
}) {
  const recent = attendance.slice(0, 12);
  return (
    <GlassCard className="h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Realtime attendance feed</h2>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> live
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {loading && recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-muted-foreground">
            Syncing…
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-muted-foreground">
            No scans yet
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {recent.map((r) => {
              const p = profiles.get(r.student_id);
              const Icon = MEAL_ICONS[r.meal_type] ?? Utensils;
              const tone =
                r.status === "approved"
                  ? { dot: "bg-success", label: "Approved", chip: "bg-success/15 text-success" }
                  : r.status === "credit"
                    ? { dot: "bg-warning", label: "On credit", chip: "bg-warning/15 text-warning" }
                    : { dot: "bg-destructive", label: "Invalid", chip: "bg-destructive/15 text-destructive" };
              return (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 rounded-2xl border border-white/5 bg-secondary/30 px-3 py-2.5"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {p?.name ?? "Unknown student"}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {p?.roll_number ?? "—"} · {r.meal_type}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone.chip}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                      {tone.label}
                    </span>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {new Date(r.scanned_at).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </GlassCard>
  );
}

function RecentPayments({
  payments,
  profiles,
}: {
  payments: PaymentRow[];
  profiles: Map<string, ProfileRow>;
}) {
  const list = payments.slice(0, 8);
  return (
    <GlassCard>
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Recent payments</h2>
      </div>
      <div className="mt-3 space-y-2">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-xs text-muted-foreground">
            No payment records yet
          </div>
        ) : (
          list.map((p) => {
            const profile = profiles.get(p.student_id);
            const positive = Number(p.amount) >= 0;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-secondary/30 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{profile?.name ?? p.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {p.title} ·{" "}
                    {new Date(p.created_at).toLocaleDateString(undefined, {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-semibold ${
                      positive ? "text-success" : "text-destructive"
                    }`}
                  >
                    {positive ? "+" : ""}₹{Number(p.amount).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{p.status}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </GlassCard>
  );
}

function StudentSearch({
  profiles,
  attendance,
}: {
  profiles: ProfileRow[];
  attendance: AttendanceRow[];
}) {
  const [q, setQ] = useState("");
  const today = todayKey();
  const monthStart = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const stats = useMemo(() => {
    const m = new Map<string, { today: number; month: number }>();
    for (const r of attendance) {
      if (r.status === "invalid") continue;
      const cur = m.get(r.student_id) ?? { today: 0, month: 0 };
      if (r.scanned_date === today) cur.today += 1;
      if (new Date(r.scanned_at).getTime() >= monthStart) cur.month += 1;
      m.set(r.student_id, cur);
    }
    return m;
  }, [attendance, today, monthStart]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = term
      ? profiles.filter(
          (p) =>
            p.name.toLowerCase().includes(term) ||
            (p.roll_number ?? "").toLowerCase().includes(term) ||
            (p.room ?? "").toLowerCase().includes(term),
        )
      : profiles;
    return list.slice(0, 30);
  }, [profiles, q]);

  return (
    <GlassCard>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Students</h2>
          <span className="text-[11px] text-muted-foreground">{profiles.length} total</span>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, roll, room…"
            className="h-10 w-full rounded-full border border-white/10 bg-secondary/40 pl-9 pr-3 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
          />
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-white/5">
        <div className="grid grid-cols-12 bg-secondary/50 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <div className="col-span-5 sm:col-span-4">Student</div>
          <div className="col-span-3 hidden sm:block">Hostel</div>
          <div className="col-span-3 sm:col-span-2 text-right">Today</div>
          <div className="col-span-2 hidden sm:block text-right">Month</div>
          <div className="col-span-4 sm:col-span-1 text-right">Balance</div>
        </div>
        <div className="divide-y divide-white/5">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              No students match "{q}"
            </div>
          ) : (
            filtered.map((p) => {
              const s = stats.get(p.id) ?? { today: 0, month: 0 };
              const bal = Number(p.balance ?? 0);
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-12 items-center px-3 py-2.5 text-xs hover:bg-white/[0.03]"
                >
                  <div className="col-span-5 sm:col-span-4 min-w-0">
                    <p className="truncate font-medium text-foreground">{p.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {p.roll_number ?? "—"}
                    </p>
                  </div>
                  <div className="col-span-3 hidden truncate text-muted-foreground sm:block">
                    {p.block}-{p.room}
                  </div>
                  <div className="col-span-3 sm:col-span-2 text-right tabular-nums">{s.today}</div>
                  <div className="col-span-2 hidden text-right tabular-nums text-muted-foreground sm:block">
                    {s.month}
                  </div>
                  <div
                    className={`col-span-4 sm:col-span-1 text-right font-semibold tabular-nums ${
                      bal < 0 ? "text-destructive" : "text-success"
                    }`}
                  >
                    ₹{bal.toLocaleString()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function useAdminAnalytics() {
  const [data, setData] = useState<Analytics>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const since = new Date();
      since.setDate(since.getDate() - 14);
      const [profilesRes, attendanceRes, paymentsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, name, roll_number, hostel, block, room, balance")
          .order("name", { ascending: true })
          .limit(500),
        supabase
          .from("attendance")
          .select("id, student_id, meal_type, status, amount, scanned_at, scanned_date")
          .gte("scanned_at", since.toISOString())
          .order("scanned_at", { ascending: false })
          .limit(500),
        supabase
          .from("payments")
          .select("id, student_id, title, amount, status, payment_type, created_at")
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (attendanceRes.error) throw attendanceRes.error;
      if (paymentsRes.error) throw paymentsRes.error;
      setData({
        profiles: (profilesRes.data ?? []) as ProfileRow[],
        attendance: (attendanceRes.data ?? []) as AttendanceRow[],
        payments: (paymentsRes.data ?? []) as PaymentRow[],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load admin analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, []);

  return { data, loading, error };
}