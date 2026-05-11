import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Clock, LucideIcon } from "lucide-react";

type Status = {
  key: string;
  label: string;
  sub: string;
  gradient: string;
  icon: LucideIcon;
};

const STATUSES: Status[] = [
  {
    key: "approved",
    label: "Meal Approved",
    sub: "All meals active today",
    gradient: "var(--gradient-success)",
    icon: CheckCircle2,
  },
  {
    key: "pending",
    label: "Payment Pending",
    sub: "Clear by 5th to avoid hold",
    gradient: "var(--gradient-danger)",
    icon: AlertCircle,
  },
  {
    key: "credit",
    label: "Credit Mode",
    sub: "₹420 from credit balance",
    gradient: "var(--gradient-warning)",
    icon: Clock,
  },
];

export function StatusCards() {
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Today's status</h2>
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STATUSES.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.06 }}
              className="min-w-[180px] flex-1 rounded-2xl p-4 text-white"
              style={{ background: s.gradient, boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5" />
                <span className="h-2 w-2 rounded-full bg-white/80" />
              </div>
              <p className="mt-3 text-sm font-semibold">{s.label}</p>
              <p className="text-[11px] text-white/80">{s.sub}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
