import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarCheck,
  CreditCard,
  Hash,
  Mail,
  ScanLine,
  Utensils,
  Wallet,
} from "lucide-react";
import { computeStats, useMessStore } from "@/lib/mess-store";
import { SectionCard } from "@/components/mess/section-card";
import { SkeletonCard } from "@/components/mess/skeleton-card";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Mess Portal" },
      { name: "description", content: "Your hostel mess account, plan and stats." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { student, balance, scans, payments, hydrated } = useMessStore();
  const stats = computeStats(scans);
  const totalSpent = payments
    .filter((p) => p.amount > 0)
    .reduce((s, p) => s + p.amount, 0);

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
            <p className="text-xs text-muted-foreground">Account</p>
            <h1 className="text-base font-semibold text-foreground">Profile</h1>
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
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 overflow-hidden rounded-3xl p-5 text-white"
              style={{
                background: "var(--gradient-hero)",
                boxShadow: "var(--shadow-glow)",
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="grid h-16 w-16 place-items-center rounded-2xl text-2xl font-bold backdrop-blur"
                  style={{ background: "rgba(255,255,255,0.18)" }}
                >
                  {student.initials}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{student.name}</h2>
                  <p className="text-xs text-white/70">
                    {student.rollNo} · joined {student.joined}
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider backdrop-blur">
                    <BadgeCheck className="h-3 w-3" />
                    {student.plan}
                  </span>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-white">
                <Glass label="Balance" value={`₹${balance.toFixed(0)}`} />
                <Glass label="Attendance" value={`${stats.attendancePct}%`} />
              </div>
            </motion.div>

            <SectionCard className="mt-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Hostel info
              </h3>
              <ul className="space-y-3 text-sm">
                <Row icon={Building2} label="Hostel" value={student.hostel} />
                <Row icon={Hash} label="Block / Room" value={`${student.block} · ${student.room}`} />
                <Row icon={Utensils} label="Mess plan" value={student.plan} />
                <Row icon={CalendarCheck} label="Plan ends" value={student.planEnds} />
                <Row icon={Mail} label="Roll No" value={student.rollNo} />
              </ul>
            </SectionCard>

            <h3 className="mt-6 mb-3 text-sm font-semibold text-foreground">
              QR scan statistics
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Stat icon={ScanLine} label="Total scans" value={stats.totalScans} tint="var(--gradient-primary)" />
              <Stat icon={CalendarCheck} label="Approved" value={stats.approved} tint="var(--gradient-success)" />
              <Stat icon={Wallet} label="Credit used" value={`₹${stats.creditUsed}`} tint="var(--gradient-warning)" />
              <Stat icon={CreditCard} label="Total recharged" value={`₹${totalSpent}`} tint="var(--gradient-hero)" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Glass({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
      <p className="text-[10px] uppercase tracking-wider text-white/70">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className="font-medium text-foreground">{value}</span>
    </li>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof Building2;
  label: string;
  value: string | number;
  tint: string;
}) {
  return (
    <div
      className="rounded-2xl border border-border bg-card p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <span
        className="grid h-9 w-9 place-items-center rounded-xl text-white"
        style={{ background: tint }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 text-lg font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
