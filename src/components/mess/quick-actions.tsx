import { motion } from "framer-motion";
import { CalendarCheck, CreditCard, Wallet, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { computeStats, useMessStore } from "@/lib/mess-store";
import { PaymentDialog } from "./payment-dialog";

export function QuickActions() {
  const [open, setOpen] = useState(false);
  const { balance, scans } = useMessStore();
  const stats = computeStats(scans);

  const actions: {
    label: string;
    icon: LucideIcon;
    tint: string;
    onClick: () => void;
  }[] = [
    {
      label: "Make Payment",
      icon: CreditCard,
      tint: "var(--gradient-primary)",
      onClick: () => setOpen(true),
    },
    {
      label: "Attendance",
      icon: CalendarCheck,
      tint: "var(--gradient-success)",
      onClick: () =>
        toast(`Attendance ${stats.attendancePct}%`, {
          description: `${stats.approved + stats.credit} of ${stats.totalScans} scans counted.`,
        }),
    },
    {
      label: "Balance",
      icon: Wallet,
      tint: "var(--gradient-warning)",
      onClick: () =>
        toast(`Balance ₹${balance.toFixed(2)}`, {
          description:
            balance < 0 ? "On credit · settle soon" : "Plan ends 30 Nov",
        }),
    },
  ];

  return (
    <>
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Quick actions
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {actions.map((a, i) => (
            <motion.button
              key={a.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.05 }}
              whileTap={{ scale: 0.96 }}
              onClick={a.onClick}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <span
                className="grid h-11 w-11 place-items-center rounded-2xl text-white"
                style={{ background: a.tint }}
              >
                <a.icon className="h-5 w-5" />
              </span>
              <span className="text-center text-xs font-medium leading-tight text-foreground">
                {a.label}
              </span>
            </motion.button>
          ))}
        </div>
      </section>

      <PaymentDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
