import { motion } from "framer-motion";
import { QrCode, ScanLine } from "lucide-react";
import { SectionCard } from "./section-card";

export function QrScanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mt-6"
    >
      <SectionCard>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Scan to enter mess</h2>
            <p className="text-xs text-muted-foreground">Point at the counter QR</p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
            Live
          </span>
        </div>

        <div
          className="relative mx-auto mt-4 grid h-56 w-56 place-items-center overflow-hidden rounded-3xl"
          style={{ background: "oklch(0.15 0.02 240)" }}
        >
          <QrCode className="h-32 w-32 text-white/85" strokeWidth={1.2} />
          <span className="absolute left-3 top-3 h-6 w-6 rounded-tl-xl border-l-2 border-t-2 border-primary-glow" />
          <span className="absolute right-3 top-3 h-6 w-6 rounded-tr-xl border-r-2 border-t-2 border-primary-glow" />
          <span className="absolute bottom-3 left-3 h-6 w-6 rounded-bl-xl border-b-2 border-l-2 border-primary-glow" />
          <span className="absolute bottom-3 right-3 h-6 w-6 rounded-br-xl border-b-2 border-r-2 border-primary-glow" />
          <motion.span
            className="absolute left-4 right-4 h-[2px] rounded-full"
            style={{
              background: "var(--gradient-primary)",
              boxShadow: "0 0 12px oklch(0.72 0.17 165)",
            }}
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
      </SectionCard>
    </motion.div>
  );
}
