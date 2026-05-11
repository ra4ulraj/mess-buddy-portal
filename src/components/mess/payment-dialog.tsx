import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { addPayment } from "@/lib/mess-store";

const PRESETS = [500, 1000, 2000, 3200];

export function PaymentDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState<number>(1000);
  const [loading, setLoading] = useState(false);

  function pay() {
    if (amount <= 0) return;
    setLoading(true);
    setTimeout(() => {
      addPayment(amount);
      setLoading(false);
      toast.success("Payment successful", {
        description: `₹${amount} added to your mess wallet.`,
      });
      onClose();
    }, 800);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-t-3xl border border-border bg-card sm:rounded-3xl"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Top up
                </p>
                <h3 className="text-base font-semibold text-foreground">
                  Make a payment
                </h3>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              <div
                className="rounded-2xl p-4 text-white"
                style={{ background: "var(--gradient-primary)" }}
              >
                <p className="text-xs uppercase tracking-widest text-white/70">
                  Amount
                </p>
                <p className="mt-1 text-3xl font-bold">₹{amount.toLocaleString()}</p>
                <p className="mt-1 text-[11px] text-white/70">
                  Pay via UPI · GPay / PhonePe
                </p>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setAmount(p)}
                    className={`rounded-xl border py-2 text-xs font-semibold transition-colors ${
                      amount === p
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary text-foreground"
                    }`}
                  >
                    ₹{p}
                  </button>
                ))}
              </div>

              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                className="mt-3 w-full rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-primary"
                placeholder="Custom amount"
              />

              <button
                disabled={loading || amount <= 0}
                onClick={pay}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
                style={{
                  background: "var(--gradient-primary)",
                  boxShadow: "var(--shadow-glow)",
                }}
              >
                <CreditCard className="h-4 w-4" />
                {loading ? "Processing…" : `Pay ₹${amount}`}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
