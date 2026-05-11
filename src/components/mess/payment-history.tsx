import { motion } from "framer-motion";
import { CreditCard } from "lucide-react";
import { SectionHeader } from "./section-card";

type Tone = "success" | "warning" | "danger";
type Tx = { title: string; date: string; amount: string; status: string; tone: Tone };

const TX: Tx[] = [
  { title: "November Plan", date: "01 Nov", amount: "-₹3,200", status: "Paid", tone: "success" },
  { title: "Credit top-up", date: "24 Oct", amount: "+₹500", status: "Credit", tone: "warning" },
  { title: "October Plan", date: "01 Oct", amount: "-₹3,200", status: "Pending", tone: "danger" },
];

const TONE: Record<Tone, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning-foreground",
  danger: "bg-destructive/15 text-destructive",
};

export function PaymentHistory() {
  return (
    <section className="mt-7">
      <SectionHeader
        title="Payment history"
        action={<button className="text-xs font-medium text-primary">View all</button>}
      />
      <div className="space-y-2.5">
        {TX.map((t, i) => (
          <motion.div
            key={t.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 * i }}
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
              <span
                className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${TONE[t.tone]}`}
              >
                {t.status}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
