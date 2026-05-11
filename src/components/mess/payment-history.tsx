import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Clock } from "lucide-react";
import { SectionHeader } from "./section-card";
import { useMessStore, type PaymentRecord } from "@/lib/mess-store";

function fmt(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
}

const TONE: Record<PaymentRecord["status"], string> = {
  Paid: "bg-success/15 text-success",
  Credit: "bg-warning/20 text-warning-foreground",
  Pending: "bg-destructive/15 text-destructive",
};

export function PaymentHistory() {
  const { payments } = useMessStore();
  const recent = payments.slice(0, 6);

  return (
    <section className="mt-7">
      <SectionHeader
        title="Payment history"
        action={
          <span className="text-xs text-muted-foreground">
            {payments.length} record{payments.length === 1 ? "" : "s"}
          </span>
        }
      />
      {recent.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed border-border bg-card p-6 text-center"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <p className="text-sm font-medium text-foreground">No payments yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Use Make Payment to recharge your wallet.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {recent.map((t, i) => {
            const positive = t.amount > 0;
            const Icon =
              t.type === "credit" ? Clock : positive ? ArrowDownLeft : ArrowUpRight;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 * i }}
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
                      {fmt(t.ts)} {t.method ? `· ${t.method}` : ""}
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
                    className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${TONE[t.status]}`}
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
  );
}
