import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  X,
} from "lucide-react";
import {
  commitScan,
  commitInvalid,
  MEAL_PRICE,
  previewState,
  validateQr,
  type ScanRecord,
} from "@/lib/mess-store";

type Phase = "scanning" | "askCredit" | "result" | "error";

const REGION_ID = "mess-qr-region";

export function ScannerModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("scanning");
  const [record, setRecord] = useState<ScanRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingQr, setPendingQr] = useState<string | null>(null);

  const scannerRef = useRef<unknown>(null);
  const stoppedRef = useRef(false);

  // Lifecycle: start scanner when open + scanning
  useEffect(() => {
    if (!open || phase !== "scanning") return;
    let cancelled = false;
    stoppedRef.current = false;
    setError(null);

    (async () => {
      try {
        const mod = await import("html5-qrcode");
        if (cancelled) return;
        const { Html5Qrcode } = mod;
        const instance = new Html5Qrcode(REGION_ID, { verbose: false });
        scannerRef.current = instance;

        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decoded: string) => {
            if (stoppedRef.current) return;
            stoppedRef.current = true;
            handleDecoded(decoded);
          },
          () => {
            /* ignore decode errors */
          },
        );
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Unable to access camera";
        setError(msg);
        setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phase]);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      stopScanner();
      // reset after exit animation
      const t = setTimeout(() => {
        setPhase("scanning");
        setRecord(null);
        setPendingQr(null);
        setError(null);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  function stopScanner() {
    const inst = scannerRef.current as
      | { stop: () => Promise<void>; clear: () => void; isScanning?: boolean }
      | null;
    if (inst) {
      try {
        if (inst.isScanning) {
          inst.stop().then(() => inst.clear()).catch(() => undefined);
        }
      } catch {
        /* ignore */
      }
      scannerRef.current = null;
    }
  }

  function handleDecoded(qr: string) {
    stopScanner();
    const validation = validateQr(qr);
    if (!validation.ok) {
      const r = commitInvalid(qr, validation.reason);
      setRecord(r);
      setPhase("result");
      toast.error(validation.reason, { description: "Scan rejected." });
      return;
    }
    const sessionMeal = validation.meal;
    const next = previewState();
    if (next === "pending") {
      setPendingQr(qr);
      setPhase("askCredit");
      toast.error("Payment Pending", {
        description: "Insufficient balance for this meal.",
      });
    } else {
      const r = commitScan(qr, true, sessionMeal);
      setRecord(r);
      setPhase("result");
      toast.success("Meal Approved", {
        description: `${sessionMeal} · attendance marked. Balance ₹${r.balanceAfter.toFixed(2)}.`,
      });
    }
  }

  function answerCredit(yes: boolean) {
    if (!pendingQr) return;
    const v = validateQr(pendingQr);
    const sessionMeal = v.ok ? v.meal : undefined;
    const r = commitScan(pendingQr, yes, sessionMeal);
    setRecord(r);
    setPhase("result");
    if (yes) {
      toast("Credit Activated", {
        description: `Food taken on credit. Balance ₹${r.balanceAfter.toFixed(2)}.`,
      });
    } else {
      toast("Meal declined", { description: "No charge applied." });
    }
  }

  function rescan() {
    setRecord(null);
    setPendingQr(null);
    setError(null);
    setPhase("scanning");
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-border bg-card sm:rounded-3xl"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Mess Scanner
                </p>
                <h3 className="text-base font-semibold text-foreground">
                  {phase === "scanning" && "Tap to Scan QR"}
                  {phase === "askCredit" && "Payment Pending"}
                  {phase === "result" && "Scan Result"}
                  {phase === "error" && "Camera Error"}
                </h3>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground transition-transform active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              {phase === "scanning" && (
                <ScanningView regionId={REGION_ID} />
              )}
              {phase === "askCredit" && (
                <CreditPrompt onAnswer={answerCredit} />
              )}
              {phase === "result" && record && (
                <ResultView record={record} onRescan={rescan} onClose={onClose} />
              )}
              {phase === "error" && (
                <ErrorView message={error ?? "Unknown error"} onRetry={rescan} />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ScanningView({ regionId }: { regionId: string }) {
  return (
    <div>
      <div
        className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-3xl bg-black"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div id={regionId} className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
        <span className="pointer-events-none absolute left-3 top-3 h-7 w-7 rounded-tl-xl border-l-2 border-t-2 border-primary-glow" />
        <span className="pointer-events-none absolute right-3 top-3 h-7 w-7 rounded-tr-xl border-r-2 border-t-2 border-primary-glow" />
        <span className="pointer-events-none absolute bottom-3 left-3 h-7 w-7 rounded-bl-xl border-b-2 border-l-2 border-primary-glow" />
        <span className="pointer-events-none absolute bottom-3 right-3 h-7 w-7 rounded-br-xl border-b-2 border-r-2 border-primary-glow" />
        <motion.span
          className="pointer-events-none absolute left-4 right-4 h-[2px] rounded-full"
          style={{
            background: "var(--gradient-primary)",
            boxShadow: "0 0 12px oklch(0.72 0.17 165)",
          }}
          initial={{ top: "10%" }}
          animate={{ top: ["10%", "88%", "10%"] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Align the QR inside the frame. Camera will auto-detect.
      </p>
    </div>
  );
}

function CreditPrompt({ onAnswer }: { onAnswer: (yes: boolean) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center"
    >
      <div
        className="mx-auto grid h-16 w-16 place-items-center rounded-full text-white"
        style={{ background: "var(--gradient-danger)" }}
      >
        <AlertCircle className="h-8 w-8" />
      </div>
      <h4 className="mt-4 text-lg font-semibold text-foreground">
        Payment Pending
      </h4>
      <p className="mt-1 text-sm text-muted-foreground">
        Your balance is too low for this meal.
      </p>
      <p className="mt-4 text-sm font-medium text-foreground">
        Do you want food on credit?
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => onAnswer(false)}
          className="rounded-2xl border border-border bg-secondary py-3 text-sm font-semibold text-foreground transition-transform active:scale-[0.97]"
        >
          NO
        </button>
        <button
          onClick={() => onAnswer(true)}
          className="rounded-2xl py-3 text-sm font-semibold text-white transition-transform active:scale-[0.97]"
          style={{ background: "var(--gradient-warning)" }}
        >
          YES
        </button>
      </div>
    </motion.div>
  );
}

function ResultView({
  record,
  onRescan,
  onClose,
}: {
  record: ScanRecord;
  onRescan: () => void;
  onClose: () => void;
}) {
  const cfg = {
    approved: {
      title: "Meal Approved",
      sub: "Attendance marked successfully",
      icon: CheckCircle2,
      gradient: "var(--gradient-success)",
    },
    pending: {
      title: "Meal Declined",
      sub: "No food taken. Pay to resume.",
      icon: AlertCircle,
      gradient: "var(--gradient-danger)",
    },
    credit: {
      title: "Food taken on credit",
      sub: "Settle credit at the next payment cycle",
      icon: Clock,
      gradient: "var(--gradient-warning)",
    },
  }[record.state];
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 22, stiffness: 240 }}
      className="text-center"
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.05, type: "spring", damping: 14 }}
        className="mx-auto grid h-20 w-20 place-items-center rounded-full text-white"
        style={{ background: cfg.gradient, boxShadow: "var(--shadow-glow)" }}
      >
        <Icon className="h-10 w-10" />
      </motion.div>
      <h4 className="mt-4 text-lg font-semibold text-foreground">{cfg.title}</h4>
      <p className="mt-1 text-sm text-muted-foreground">{cfg.sub}</p>

      <div className="mt-5 grid grid-cols-2 gap-3 text-left">
        <div className="rounded-2xl border border-border bg-secondary/60 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Meal
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {record.meal}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-secondary/60 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Charged
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            ₹{record.amount}
          </p>
        </div>
        <div className="col-span-2 rounded-2xl border border-border bg-secondary/60 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Remaining balance
          </p>
          <p
            className={`mt-1 text-base font-bold ${
              record.balanceAfter < 0 ? "text-destructive" : "text-foreground"
            }`}
          >
            ₹{record.balanceAfter.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={onRescan}
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-secondary py-3 text-sm font-semibold text-foreground transition-transform active:scale-[0.97]"
        >
          <RotateCcw className="h-4 w-4" />
          Scan again
        </button>
        <button
          onClick={onClose}
          className="rounded-2xl py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.97]"
          style={{ background: "var(--gradient-primary)" }}
        >
          Done
        </button>
      </div>

      <p className="mt-3 text-[10px] text-muted-foreground">
        Meal price ₹{MEAL_PRICE} · Saved to history
      </p>
    </motion.div>
  );
}

function ErrorView({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="text-center">
      <div
        className="mx-auto grid h-16 w-16 place-items-center rounded-full text-white"
        style={{ background: "var(--gradient-danger)" }}
      >
        <AlertCircle className="h-8 w-8" />
      </div>
      <h4 className="mt-4 text-lg font-semibold text-foreground">
        Camera unavailable
      </h4>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Allow camera permission and ensure you're on HTTPS or localhost.
      </p>
      <button
        onClick={onRetry}
        className="mt-5 w-full rounded-2xl py-3 text-sm font-semibold text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        Try again
      </button>
    </div>
  );
}
