import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, RotateCcw, RefreshCw, Power } from "lucide-react";
import { TopBar } from "@/components/mess/top-bar";
import { SectionCard } from "@/components/mess/section-card";
import {
  generateQrToken,
  getActiveMeal,
  MEAL_WINDOWS,
  regenerateSalt,
  resetAttendance,
  setActiveMealOverride,
  todayKey,
  useMessStore,
  type SessionMeal,
} from "@/lib/mess-store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin · Mess QR controls" },
      { name: "description", content: "Mess admin: change session, regenerate QR, reset attendance." },
    ],
  }),
  component: AdminPage,
});

const MEALS: SessionMeal[] = ["Breakfast", "Lunch", "Dinner"];

function AdminPage() {
  const store = useMessStore();
  const active = getActiveMeal();
  const token = generateQrToken(active);
  const day = todayKey();
  const todays = store.attendance[day] ?? {};
  const takenCount = Object.keys(todays).length;

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="mx-auto max-w-md px-5 sm:max-w-lg">
        <TopBar />

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          <SectionCard>
            <div className="flex items-center gap-3">
              <div
                className="grid h-11 w-11 place-items-center rounded-2xl text-white"
                style={{ background: "var(--gradient-primary)" }}
              >
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Admin Console
                </p>
                <h1 className="text-base font-semibold text-foreground">
                  Mess QR Controls
                </h1>
              </div>
            </div>
          </SectionCard>
        </motion.div>

        <div className="mt-4">
          <SectionCard>
            <h2 className="text-sm font-semibold text-foreground">Active meal</h2>
            <p className="text-xs text-muted-foreground">
              Override the current meal session. Auto follows clock.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setActiveMealOverride(null);
                  toast("Auto mode", { description: "Session follows clock." });
                }}
                className="rounded-2xl border border-border bg-secondary py-2.5 text-xs font-semibold text-foreground transition active:scale-[0.97]"
                style={
                  store.activeMealOverride === null
                    ? { background: "var(--gradient-primary)", color: "var(--primary-foreground)", border: "none" }
                    : undefined
                }
              >
                Auto · {active ?? "Closed"}
              </button>
              {MEALS.map((m) => {
                const sel = store.activeMealOverride === m;
                const w = MEAL_WINDOWS[m];
                return (
                  <button
                    key={m}
                    onClick={() => {
                      setActiveMealOverride(m);
                      toast(`Switched to ${m}`, { description: `${w.start}:00–${w.end}:00` });
                    }}
                    className="rounded-2xl border border-border bg-secondary py-2.5 text-xs font-semibold text-foreground transition active:scale-[0.97]"
                    style={
                      sel
                        ? { background: "var(--gradient-primary)", color: "var(--primary-foreground)", border: "none" }
                        : undefined
                    }
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </SectionCard>
        </div>

        <div className="mt-4">
          <SectionCard>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Live QR</h2>
              <button
                onClick={() => {
                  regenerateSalt();
                  toast.success("New QR generated", { description: "Old tokens are now invalid." });
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold text-foreground transition active:scale-[0.97]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                New QR
              </button>
            </div>
            <div className="mt-3 grid place-items-center">
              {token ? (
                <div className="rounded-2xl bg-white p-3">
                  <QRCodeSVG value={token} size={180} level="M" />
                </div>
              ) : (
                <div className="grid h-44 w-44 place-items-center rounded-2xl bg-secondary text-center text-xs text-muted-foreground">
                  No active meal session
                </div>
              )}
            </div>
            <p className="mt-3 break-all text-center text-[10px] text-muted-foreground">
              {token ?? "—"}
            </p>
          </SectionCard>
        </div>

        <div className="mt-4">
          <SectionCard>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Today's attendance</h2>
                <p className="text-xs text-muted-foreground">
                  {takenCount}/3 meals marked · {day}
                </p>
              </div>
              <button
                onClick={() => {
                  resetAttendance();
                  toast("Attendance reset", { description: "All meals re-openable." });
                }}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white transition active:scale-[0.97]"
                style={{ background: "var(--gradient-danger)" }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>
            <ul className="mt-3 space-y-2">
              {MEALS.map((m) => (
                <li
                  key={m}
                  className="flex items-center justify-between rounded-2xl border border-border bg-secondary/60 px-3 py-2.5 text-sm"
                >
                  <span className="font-medium text-foreground">{m}</span>
                  {todays[m] ? (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                      style={{ background: "var(--gradient-success)" }}
                    >
                      Marked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Power className="h-3 w-3" /> Open
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
