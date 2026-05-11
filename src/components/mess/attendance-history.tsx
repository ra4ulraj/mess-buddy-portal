import { CheckCircle2, Clock, XCircle, type LucideIcon } from "lucide-react";
import { SectionHeader } from "./section-card";
import { useMessStore, type ScanState } from "@/lib/mess-store";

const STATE_META: Record<
  ScanState,
  { icon: LucideIcon; label: string; tone: string }
> = {
  approved: { icon: CheckCircle2, label: "Approved", tone: "text-success" },
  pending: { icon: XCircle, label: "Declined", tone: "text-destructive" },
  credit: { icon: Clock, label: "On credit", tone: "text-warning-foreground" },
};

function fmt(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    weekday: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AttendanceHistory() {
  const { scans } = useMessStore();
  const recent = scans.slice(0, 6);

  return (
    <section className="mt-7">
      <SectionHeader
        title="Attendance history"
        action={
          <span className="text-xs text-muted-foreground">
            {scans.length} scan{scans.length === 1 ? "" : "s"}
          </span>
        }
      />
      {recent.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed border-border bg-card p-6 text-center"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <p className="text-sm font-medium text-foreground">No scans yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tap the QR scanner to mark your first meal.
          </p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-2xl border border-border bg-card"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          {recent.map((s, i) => {
            const meta = STATE_META[s.state];
            const Icon = meta.icon;
            return (
              <div
                key={s.id}
                className={`flex items-center justify-between px-4 py-3 ${
                  i !== recent.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-xl bg-secondary ${meta.tone}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {s.meal}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {fmt(s.ts)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {s.amount > 0 ? `-₹${s.amount}` : "—"}
                  </p>
                  <p className={`text-[10px] font-medium ${meta.tone}`}>
                    {meta.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
