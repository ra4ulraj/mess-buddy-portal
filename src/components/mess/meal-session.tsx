import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Clock3, RefreshCw } from "lucide-react";
import { SectionCard } from "./section-card";
import {
  getActiveMeal,
  publishQrSession,
  MEAL_WINDOWS,
  TOKEN_TTL_MS,
  todayKey,
  useMessStore,
  type SessionMeal,
} from "@/lib/mess-store";

function formatHour(h: number) {
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}${ampm}`;
}

export function MealSession() {
  const store = useMessStore();
  const [, setTick] = useState(0);
  const [session, setSession] = useState<{ token: string; expiresAt: number } | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const active = getActiveMeal();
  const day = todayKey();
  const taken = active ? !!store.attendance[day]?.[active] : false;
  const token = session?.token ?? null;
  const expiresIn = session ? Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 1000)) : 0;
  const pct = Math.max(0, Math.min(100, (expiresIn / (TOKEN_TTL_MS / 1000)) * 100));

  useEffect(() => {
    let cancelled = false;
    if (!active) {
      setSession(null);
      return;
    }
    if (session && session.expiresAt - Date.now() > 1000) return;
    publishQrSession(active)
      .then((s) => {
        if (!cancelled) setSession(s);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [active, session?.expiresAt]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="mt-6"
    >
      <SectionCard>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Active session
            </p>
            <h2 className="mt-0.5 text-base font-semibold text-foreground">
              {active ?? "No meal session"}
            </h2>
          </div>
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white"
            style={{
              background: active
                ? "var(--gradient-success)"
                : "var(--gradient-danger)",
            }}
          >
            {active ? "Open" : "Closed"}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
          {(Object.keys(MEAL_WINDOWS) as SessionMeal[]).map((m) => {
            const w = MEAL_WINDOWS[m];
            const isActive = m === active;
            const wasTaken = !!store.attendance[day]?.[m];
            return (
              <span
                key={m}
                className="rounded-full border border-border px-2 py-1 font-medium"
                style={{
                  background: isActive ? "var(--secondary)" : "transparent",
                  color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
                }}
              >
                {m} · {formatHour(w.start)}–{formatHour(w.end)}
                {wasTaken ? " ✓" : ""}
              </span>
            );
          })}
        </div>

        {active && token && (
          <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-4">
            <div className="rounded-2xl bg-white p-2.5">
              <QRCodeSVG value={token} size={104} level="M" includeMargin={false} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Token rotates every {TOKEN_TTL_MS / 1000}s
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Clock3 className="h-4 w-4 text-primary" />
                Expires in {expiresIn}s
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-[width] duration-1000"
                  style={{ width: `${pct}%`, background: "var(--gradient-primary)" }}
                />
              </div>
              {taken && (
                <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-success">
                  <RefreshCw className="h-3 w-3" />
                  Attendance already marked for {active}
                </p>
              )}
            </div>
          </div>
        )}

        {!active && (
          <p className="mt-4 text-xs text-muted-foreground">
            Next session opens at the scheduled meal time. QR cannot be generated outside windows.
          </p>
        )}
      </SectionCard>
    </motion.div>
  );
}
