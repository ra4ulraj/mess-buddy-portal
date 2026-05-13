import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  BarChart3,
  CircleDollarSign,
  Power,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Users,
  Utensils,
} from "lucide-react";
import { TopBar } from "@/components/mess/top-bar";
import { SectionCard } from "@/components/mess/section-card";
import { supabase } from "@/integrations/supabase/client";
import {
  generateQrToken,
  getActiveMeal,
  MEAL_WINDOWS,
  regenerateSalt,
  resetAttendance,
  setActiveMealOverride,
  todayKey,
  useMessStore,
  type SessionMeal,
} from "@/lib/mess-store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — MessMate Hostel Mess Analytics" },
      {
        name: "description",
        content:
          "MessMate admin control panel — monitor live QR meal sessions, attendance counts, pending dues, revenue collected, and manage active meal windows for your hostel.",
      },
      { property: "og:title", content: "Admin Panel — MessMate" },
      {
        property: "og:description",
        content:
          "Real-time hostel mess analytics: meals served, active students, pending dues and revenue — plus QR session controls for admins.",
      },
      { property: "og:url", content: "/admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "/admin" }],
  }),
  component: AdminPage,
});

const MEALS: SessionMeal[] = ["Breakfast", "Lunch", "Dinner"];

type Analytics = {
  students: number;
  todayAttendance: number;
  todayCredit: number;
  totalBalance: number;
  totalDues: number;
  monthCollection: number;
  mealCounts: Record<SessionMeal, number>;
  recentPayments: { id: string; title: string; amount: number; status: string; created_at: string }[];
};

const EMPTY_ANALYTICS: Analytics = {
  students: 0,
  todayAttendance: 0,
  todayCredit: 0,
  totalBalance: 0,
  totalDues: 0,
  monthCollection: 0,
  mealCounts: { Breakfast: 0, Lunch: 0, Dinner: 0 },
  recentPayments: [],
};

function AdminPage() {
  const store = useMessStore();
  const analytics = useAdminAnalytics();
  const active = getActiveMeal();
  const token = generateQrToken(active);
  const day = todayKey();
  const takenCount = analytics.data.todayAttendance;

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="mx-auto max-w-md px-5 sm:max-w-lg">
        <TopBar />

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          <SectionCard>
            <div className="flex items-center gap-3">
              <div
                className="grid h-11 w-11 place-items-center rounded-2xl text-white"
                style={{ background: "var(--gradient-primary)" }}
              >
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Admin Console
                </p>
                <h1 className="text-base font-semibold text-foreground">
                  Live Mess Dashboard
                </h1>
              </div>
            </div>
          </SectionCard>
        </motion.div>

        {analytics.error && (
          <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {analytics.error}
          </div>
        )}

        <section className="mt-4 grid grid-cols-2 gap-3">
          <MetricCard icon={Users} label="Students" value={analytics.data.students.toString()} />
          <MetricCard icon={Utensils} label="Meals today" value={takenCount.toString()} />
          <MetricCard icon={CircleDollarSign} label="Dues" value={`₹${analytics.data.totalDues}`} danger />
          <MetricCard icon={TrendingUp} label="Month paid" value={`₹${analytics.data.monthCollection}`} />
        </section>

        <div className="mt-4">
          <SectionCard>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Attendance summary</h2>
                <p className="text-xs text-muted-foreground">
                  {day} · {analytics.loading ? "Syncing" : "Live"}
                </p>
              </div>
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-4 space-y-3">
              {MEALS.map((meal) => {
                const count = analytics.data.mealCounts[meal];
                const pct = analytics.data.students
                  ? Math.min(100, Math.round((count / analytics.data.students) * 100))
                  : 0;
                return (
                  <div key={meal}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{meal}</span>
                      <span className="text-muted-foreground">{count}/{analytics.data.students}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: "var(--gradient-primary)" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>

        <div className="mt-4">
          <SectionCard>
            <h2 className="text-sm font-semibold text-foreground">Active meal</h2>
            <p className="text-xs text-muted-foreground">
              Override the current meal session. Auto follows clock.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setActiveMealOverride(null);
                  toast("Auto mode", { description: "Session follows clock." });
                }}
                className="rounded-2xl border border-border bg-secondary py-2.5 text-xs font-semibold text-foreground transition active:scale-[0.97]"
                style={
                  store.activeMealOverride === null
                    ? { background: "var(--gradient-primary)", color: "var(--primary-foreground)", border: "none" }
                    : undefined
                }
              >
                Auto · {active ?? "Closed"}
              </button>
              {MEALS.map((m) => {
                const sel = store.activeMealOverride === m;
                const w = MEAL_WINDOWS[m];
                return (
                  <button
                    key={m}
                    onClick={() => {
                      setActiveMealOverride(m);
                      toast(`Switched to ${m}`, { description: `${w.start}:00-${w.end}:00` });
                    }}
                    className="rounded-2xl border border-border bg-secondary py-2.5 text-xs font-semibold text-foreground transition active:scale-[0.97]"
                    style={
                      sel
                        ? { background: "var(--gradient-primary)", color: "var(--primary-foreground)", border: "none" }
                        : undefined
                    }
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </SectionCard>
        </div>

        <div className="mt-4">
          <SectionCard>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Live QR</h2>
              <button
                onClick={() => {
                  regenerateSalt();
                  toast.success("New QR generated", { description: "Old tokens are now invalid." });
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold text-foreground transition active:scale-[0.97]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                New QR
              </button>
            </div>
            <div className="mt-3 grid place-items-center">
              {token ? (
                <div className="rounded-2xl bg-white p-3">
                  <QRCodeSVG value={token} size={180} level="M" />
                </div>
              ) : (
                <div className="grid h-44 w-44 place-items-center rounded-2xl bg-secondary text-center text-xs text-muted-foreground">
                  No active meal session
                </div>
              )}
            </div>
            <p className="mt-3 break-all text-center text-[10px] text-muted-foreground">
              {token ?? "—"}
            </p>
          </SectionCard>
        </div>

        <div className="mt-4">
          <SectionCard>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Today's attendance</h2>
                <p className="text-xs text-muted-foreground">
                  {takenCount} meals marked · {analytics.data.todayCredit} on credit
                </p>
              </div>
              <button
                onClick={() => {
                  resetAttendance();
                  toast("Attendance reset", { description: "New QR salt issued. Existing database records stay intact." });
                }}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white transition active:scale-[0.97]"
                style={{ background: "var(--gradient-danger)" }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset QR
              </button>
            </div>
            <ul className="mt-3 space-y-2">
              {MEALS.map((m) => (
                <li
                  key={m}
                  className="flex items-center justify-between rounded-2xl border border-border bg-secondary/60 px-3 py-2.5 text-sm"
                >
                  <span className="font-medium text-foreground">{m}</span>
                  {analytics.data.mealCounts[m] > 0 ? (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                      style={{ background: "var(--gradient-success)" }}
                    >
                      {analytics.data.mealCounts[m]} marked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Power className="h-3 w-3" /> Open
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <div className="mt-4">
          <SectionCard>
            <h2 className="text-sm font-semibold text-foreground">Recent payments</h2>
            <div className="mt-3 space-y-2">
              {analytics.data.recentPayments.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  No payment records yet
                </p>
              ) : (
                analytics.data.recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-2xl border border-border bg-secondary/60 px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{payment.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={payment.amount >= 0 ? "text-sm font-semibold text-success" : "text-sm font-semibold text-destructive"}>
                        {payment.amount >= 0 ? "+" : ""}₹{payment.amount}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{payment.status}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  danger = false,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center justify-between">
        <Icon className={danger ? "h-4 w-4 text-destructive" : "h-4 w-4 text-primary"} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Live</span>
      </div>
      <p className="mt-3 text-xl font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function useAdminAnalytics() {
  const [data, setData] = useState<Analytics>(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const today = todayKey();
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [profilesRes, attendanceRes, paymentsRes] = await Promise.all([
        supabase.from("profiles").select("balance", { count: "exact" }),
        supabase
          .from("attendance")
          .select("meal_type, status, amount")
          .eq("scanned_date", today),
        supabase
          .from("payments")
          .select("id, title, amount, status, created_at")
          .gte("created_at", monthStart.toISOString())
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (attendanceRes.error) throw attendanceRes.error;
      if (paymentsRes.error) throw paymentsRes.error;

      const balances = profilesRes.data ?? [];
      const attendance = attendanceRes.data ?? [];
      const payments = paymentsRes.data ?? [];
      const mealCounts = { ...EMPTY_ANALYTICS.mealCounts };
      for (const row of attendance) {
        const meal = row.meal_type as SessionMeal;
        if (meal in mealCounts && row.status !== "invalid") mealCounts[meal] += 1;
      }

      setData({
        students: profilesRes.count ?? balances.length,
        todayAttendance: attendance.filter((row) => row.status !== "invalid").length,
        todayCredit: attendance.filter((row) => row.status === "credit").length,
        totalBalance: balances.reduce((sum, row) => sum + Math.max(0, Number(row.balance ?? 0)), 0),
        totalDues: Math.abs(
          balances.reduce((sum, row) => sum + Math.min(0, Number(row.balance ?? 0)), 0),
        ),
        monthCollection: payments
          .filter((row) => row.status === "Paid")
          .reduce((sum, row) => sum + Math.max(0, Number(row.amount ?? 0)), 0),
        mealCounts,
        recentPayments: payments,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return { data, loading, error };
}
