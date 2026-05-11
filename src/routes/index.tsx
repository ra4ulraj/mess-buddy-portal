import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Bell,
  QrCode,
  Wallet,
  CalendarCheck,
  CreditCard,
  ScanLine,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Utensils,
  Coffee,
  Soup,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mess Portal — Hostel Student Dashboard" },
      {
        name: "description",
        content:
          "Scan, pay, and track your hostel mess attendance and balance from one beautiful mobile-first portal.",
      },
    ],
  }),
  component: MessPortal,
});

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

type Status = "approved" | "pending" | "credit";

const statusConfig: Record<
  Status,
  { label: string; sub: string; gradient: string; icon: typeof CheckCircle2 }
> = {
  approved: {
    label: "Approved",
    sub: "All meals active today",
    gradient: "var(--gradient-success)",
    icon: CheckCircle2,
  },
  pending: {
    label: "Payment Pending",
    sub: "Clear by 5th to avoid hold",
    gradient: "var(--gradient-danger)",
    icon: AlertCircle,
  },
  credit: {
    label: "Credit Used",
    sub: "₹420 from credit balance",
    gradient: "var(--gradient-warning)",
    icon: Clock,
  },
};

function MessPortal() {
  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="mx-auto max-w-md px-5">
        <TopBar />
        <Hero />
        <QrScanner />
        <StatusRow />
        <QuickActions />
        <AttendanceHistory />
        <PaymentHistory />
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <motion.header
      initial="hidden"
      animate="show"
      variants={fadeUp}
      className="flex items-center justify-between pt-6"
    >
      <div className="flex items-center gap-3">
        <div className="relative h-11 w-11 rounded-full p-[2px]" style={{ background: "var(--gradient-primary)" }}>
          <div className="flex h-full w-full items-center justify-center rounded-full bg-card text-sm font-semibold text-foreground">
            AR
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Welcome back</p>
          <h1 className="text-base font-semibold text-foreground">Aarav Reddy</h1>
        </div>
      </div>
      <button
        aria-label="Notifications"
        className="relative grid h-11 w-11 place-items-center rounded-full border border-border bg-card transition-transform active:scale-95"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <Bell className="h-5 w-5 text-foreground" />
        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-destructive" />
      </button>
    </motion.header>
  );
}

function Hero() {
  return (
    <motion.section
      initial="hidden"
      animate="show"
      custom={1}
      variants={fadeUp}
      className="mt-5 overflow-hidden rounded-3xl p-5 text-white"
      style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/70">Mess Balance</p>
          <p className="mt-1 text-3xl font-bold">₹2,480.00</p>
          <p className="mt-1 text-xs text-white/70">Plan ends · 30 Nov</p>
        </div>
        <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-medium uppercase tracking-wider backdrop-blur">
          Veg · Block C
        </span>
      </div>
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/10 p-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4" />
          <span className="text-xs">Lunch served · 12:30 PM</span>
        </div>
        <ArrowUpRight className="h-4 w-4" />
      </div>
    </motion.section>
  );
}

function QrScanner() {
  return (
    <motion.section
      initial="hidden"
      animate="show"
      custom={2}
      variants={fadeUp}
      className="mt-6 rounded-3xl border border-border bg-card p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Scan to enter mess</h2>
          <p className="text-xs text-muted-foreground">Point at the counter QR</p>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
          Live
        </span>
      </div>

      <div className="relative mx-auto mt-4 grid h-56 w-56 place-items-center overflow-hidden rounded-3xl bg-foreground/95">
        <QrCode className="h-32 w-32 text-white/85" strokeWidth={1.2} />
        {/* Corner brackets */}
        <span className="absolute left-3 top-3 h-6 w-6 rounded-tl-xl border-l-2 border-t-2 border-primary-glow" />
        <span className="absolute right-3 top-3 h-6 w-6 rounded-tr-xl border-r-2 border-t-2 border-primary-glow" />
        <span className="absolute bottom-3 left-3 h-6 w-6 rounded-bl-xl border-b-2 border-l-2 border-primary-glow" />
        <span className="absolute bottom-3 right-3 h-6 w-6 rounded-br-xl border-b-2 border-r-2 border-primary-glow" />
        {/* Scan line */}
        <motion.span
          className="absolute left-4 right-4 h-[2px] rounded-full"
          style={{ background: "var(--gradient-primary)", boxShadow: "0 0 12px oklch(0.72 0.17 165)" }}
          initial={{ top: "12%" }}
          animate={{ top: ["12%", "85%", "12%"] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <button
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
        style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
      >
        <ScanLine className="h-4 w-4" />
        Open Scanner
      </button>
    </motion.section>
  );
}

function StatusRow() {
  const items: Status[] = ["approved", "pending", "credit"];
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Today's status</h2>
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((s, i) => {
          const cfg = statusConfig[s];
          const Icon = cfg.icon;
          return (
            <motion.div
              key={s}
              initial="hidden"
              animate="show"
              custom={3 + i}
              variants={fadeUp}
              className="min-w-[180px] flex-1 rounded-2xl p-4 text-white"
              style={{ background: cfg.gradient, boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5" />
                <span className="h-2 w-2 rounded-full bg-white/80" />
              </div>
              <p className="mt-3 text-sm font-semibold">{cfg.label}</p>
              <p className="text-[11px] text-white/80">{cfg.sub}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function QuickActions() {
  const actions = [
    { label: "Pay", icon: CreditCard, tint: "var(--gradient-primary)" },
    { label: "Attendance", icon: CalendarCheck, tint: "var(--gradient-success)" },
    { label: "Balance", icon: Wallet, tint: "var(--gradient-warning)" },
  ];
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Quick actions</h2>
      <div className="grid grid-cols-3 gap-3">
        {actions.map((a, i) => (
          <motion.button
            key={a.label}
            initial="hidden"
            animate="show"
            custom={4 + i}
            variants={fadeUp}
            whileTap={{ scale: 0.96 }}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <span
              className="grid h-11 w-11 place-items-center rounded-2xl text-white"
              style={{ background: a.tint }}
            >
              <a.icon className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium text-foreground">{a.label}</span>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

function AttendanceHistory() {
  const days = [
    { date: "Mon 11", b: "on", l: "on", d: "off", icon: Coffee },
    { date: "Sun 10", b: "on", l: "on", d: "on", icon: Soup },
    { date: "Sat 09", b: "off", l: "on", d: "on", icon: Utensils },
    { date: "Fri 08", b: "on", l: "on", d: "on", icon: Soup },
  ];
  return (
    <section className="mt-7">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Attendance history</h2>
        <button className="text-xs font-medium text-primary">View all</button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
        {days.map((d, i) => (
          <div
            key={d.date}
            className={`flex items-center justify-between px-4 py-3 ${
              i !== days.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-foreground">
                <d.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{d.date}</p>
                <p className="text-[11px] text-muted-foreground">B · L · D</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {[d.b, d.l, d.d].map((m, idx) => (
                <span
                  key={idx}
                  className={`h-2.5 w-2.5 rounded-full ${
                    m === "on" ? "bg-success" : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PaymentHistory() {
  const tx = [
    { title: "November Plan", date: "01 Nov", amount: "-₹3,200", status: "Paid", tone: "success" },
    { title: "Credit top-up", date: "24 Oct", amount: "+₹500", status: "Credit", tone: "warning" },
    { title: "October Plan", date: "01 Oct", amount: "-₹3,200", status: "Pending", tone: "danger" },
  ];
  const tone: Record<string, string> = {
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    danger: "bg-destructive/15 text-destructive",
  };
  return (
    <section className="mt-7">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Payment history</h2>
        <button className="text-xs font-medium text-primary">View all</button>
      </div>
      <div className="space-y-2.5">
        {tx.map((t, i) => (
          <motion.div
            key={i}
            initial="hidden"
            animate="show"
            custom={5 + i}
            variants={fadeUp}
            className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center gap-3">
              <span
                className="grid h-10 w-10 place-items-center rounded-2xl text-white"
                style={{ background: "var(--gradient-primary)" }}
              >
                <CreditCard className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{t.title}</p>
                <p className="text-[11px] text-muted-foreground">{t.date}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">{t.amount}</p>
              <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${tone[t.tone]}`}>
                {t.status}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
