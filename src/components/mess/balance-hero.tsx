import { motion } from "framer-motion";
import { ArrowUpRight, Utensils } from "lucide-react";
import { getMealForNow, useMessStore } from "@/lib/mess-store";

export function BalanceHero() {
  const { balance } = useMessStore();
  const meal = getMealForNow();
  const negative = balance < 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      className="mt-5 overflow-hidden rounded-3xl p-5 text-white"
      style={{
        background: negative ? "var(--gradient-danger)" : "var(--gradient-hero)",
        boxShadow: "var(--shadow-glow)",
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/70">
            Mess Balance
          </p>
          <motion.p
            key={balance}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 text-3xl font-bold"
          >
            {negative ? "-" : ""}₹{Math.abs(balance).toFixed(2)}
          </motion.p>
          <p className="mt-1 text-xs text-white/70">
            {negative ? "On credit · settle soon" : "Plan ends · 30 Nov"}
          </p>
        </div>
        <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-medium uppercase tracking-wider backdrop-blur">
          Veg · Block C
        </span>
      </div>
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/10 p-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4" />
          <span className="text-xs">{meal} · serving now</span>
        </div>
        <ArrowUpRight className="h-4 w-4" />
      </div>
    </motion.section>
  );
}
