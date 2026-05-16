import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Clock,
  CreditCard,
  Plus,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PaymentDialog } from "@/components/mess/payment-dialog";
import { SkeletonCard } from "@/components/mess/skeleton-card";
import { useMessStore, type PaymentRecord } from "@/lib/mess-store";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — MessMate" },
      {
        name: "description",
        content:
          "Top up your hostel mess wallet, track recharges, pending dues, and monthly payment analytics.",
      },
    ],
    links: [{ rel: "canonical", href: "/wallet" }],
  }),
  component: WalletPage,
});

const STATUS_TONE: Record<PaymentRecord["status"], string> = {
  Paid: "bg-success/15 text-success",
  Credit: "bg-warning/20 text-warning-foreground",
  Pending: "bg-destructive/15 text-destructive",
};

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function monthKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short" });
}

type Filter = "all" | "recharge" | "credit";

function WalletPage() {
  const { balance, payments, hydrated, loading } = useMessStore();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const { recharges, dues, monthRecharge, monthDues, chart } = useMemo(() => {
    const recharges = payments.filter((p) => p.type === "recharge");
    const credits = payments.filter((p) => p.type === "credit");
    const dues = credits.reduce((s, p) => s + Math.abs(p.amount), 0);
    const thisMonth = monthKey(Date.now());
    const monthRecharge = recharges
      .filter((p) => monthKey(p.ts) === thisMonth)
      .reduce((s, p) => s + p.amount, 0);
    const monthDues = credits
      .filter((p) => monthKey(p.ts) === thisMonth)
      .reduce((s, p) => s + Math.abs(p.amount), 0);

    const months: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ key: k, label: monthLabel(k) });
    }
    const chart = months.map((m) => {
      const r = recharges
        .filter((p) => monthKey(p.ts) === m.key)
        .reduce((s, p) => s + p.amount, 0);
      const c = credits
        .filter((p) => monthKey(p.ts) === m.key)
        .reduce((s, p) => s + Math.abs(p.amount), 0);
      return { month: m.label, Recharge: r, Credit: c };
    });
    return { recharges, dues, monthRecharge, monthDues, chart };
  }, [payments]);

  const filtered = useMemo(() => {
    if (filter === "recharge") return recharges;
    if (filter === "credit") return payments.filter((p) => p.type === "credit");
    return payments;
  }, [payments, recharges, filter]);

  const negative = balance < 0;

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="mx-auto max-w-md px-5 pt-6 sm:max-w-lg">
        <header className="flex items-center gap-3">
          <Link
            to="/"
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </Link>
          <div>
            <p className="text-xs text-muted-foreground">Wallet</p>
            <h1 className="text-base font-semibold text-foreground">
              Recharge & payments
            </h1>
          </div>
        </header>

        {!hydrated ? (
          <div className="mt-5 space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <>
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 overflow-hidden rounded-3xl p-5 text-white"
              style={{
                background: negative
                  ? "var(--gradient-danger)"
                  : "var(--gradient-hero)",
                boxShadow: "var(--shadow-glow)",
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/70">
                    Wallet balance
                  </p>
                  <motion.p
                    key={balance}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 text-4xl font-bold"
                  >
                    {negative ? "-" : ""}₹{Math.abs(balance).toFixed(2)}
                  </motion.p>
                  <p className="mt-1 text-xs text-white/70">
                    {negative
                      ? "On credit · please settle"
                      : "Available for meal scans"}
                  </p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur">
                  <Wallet className="h-5 w-5" />
                </span>
              </div>

              <button
                onClick={() => setOpen(true)}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/15 py-3 text-sm font-semibold backdrop-blur transition-transform active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                Recharge wallet
              </button>
            </motion.section>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <StatCard
                label="Pending dues"
                value={`₹${dues.toFixed(0)}`}
                tone={dues > 0 ? "danger" : "muted"}
                hint={dues > 0 ? "Settle to clear credit" : "All clear"}
                icon={Clock}
              />
              <StatCard
                label="This month"
                value={`₹${monthRecharge.toFixed(0)}`}
                tone="success"
                hint={`${monthDues > 0 ? `₹${monthDues.toFixed(0)} on credit` : "No credit used"}`}
                icon={TrendingUp}
              />
            </div>

            <section className="mt-6 rounded-3xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  Monthly analytics
                </h2>
                <span className="text-[11px] text-muted-foreground">Last 6 months</span>
              </div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} barCategoryGap={14}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={32} />
                    <Tooltip
                      cursor={{ fill: "color-mix(in oklab, var(--primary) 8%, transparent)" }}
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => `₹${v}`}
                    />
                    <Bar dataKey="Recharge" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Credit" fill="var(--warning)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
                <Legend color="var(--primary)" label="Recharge" />
                <Legend color="var(--warning)" label="Credit" />
              </div>
            </section>

            <section className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  Payment records
                </h2>
                <span className="text-xs text-muted-foreground">
                  {filtered.length} record{filtered.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mb-3 flex gap-2">
                {(["all", "recharge", "credit"] as Filter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      filter === f
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {f === "all" ? "All" : f === "recharge" ? "Recharges" : "Credit"}
                  </button>
                ))}
              </div>

              {loading && filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
                  <p className="text-sm font-medium text-foreground">Syncing…</p>
                </div>
              ) : filtered.length === 0 ? (
                <div
                  className="rounded-2xl border border-dashed border-border bg-card p-6 text-center"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <p className="text-sm font-medium text-foreground">
                    No records yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Recharge your wallet to see history here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filtered.map((t, i) => {
                    const positive = t.amount > 0;
                    const Icon =
                      t.type === "credit"
                        ? Clock
                        : positive
                          ? ArrowDownLeft
                          : ArrowUpRight;
                    return (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                        className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
                        style={{ boxShadow: "var(--shadow-card)" }}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="grid h-10 w-10 place-items-center rounded-2xl text-white"
                            style={{
                              background:
                                t.type === "credit"
                                  ? "var(--gradient-warning)"
                                  : positive
                                    ? "var(--gradient-success)"
                                    : "var(--gradient-danger)",
                            }}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {t.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {fmtDate(t.ts)} {t.method ? `· ${t.method}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-sm font-semibold ${
                              positive ? "text-success" : "text-foreground"
                            }`}
                          >
                            {positive ? "+" : ""}₹{Math.abs(t.amount)}
                          </p>
                          <span
                            className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_TONE[t.status]}`}
                          >
                            {t.status}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </section>

            <button
              onClick={() => setOpen(true)}
              className="fixed bottom-24 right-5 z-30 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.97] sm:right-8"
              style={{
                background: "var(--gradient-primary)",
                boxShadow: "var(--shadow-glow)",
              }}
            >
              <CreditCard className="h-4 w-4" />
              Recharge
            </button>
          </>
        )}
      </div>
      <PaymentDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Wallet;
  tone: "success" | "danger" | "muted";
}) {
  const bg =
    tone === "danger"
      ? "var(--gradient-danger)"
      : tone === "success"
        ? "var(--gradient-success)"
        : "var(--gradient-primary)";
  return (
    <div
      className="rounded-2xl border border-border bg-card p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <span
        className="grid h-9 w-9 place-items-center rounded-xl text-white"
        style={{ background: bg }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 text-lg font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-[10px] text-muted-foreground/80">{hint}</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}