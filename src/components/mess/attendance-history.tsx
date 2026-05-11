import { Coffee, Soup, Utensils, type LucideIcon } from "lucide-react";
import { SectionHeader } from "./section-card";

type Day = { date: string; b: boolean; l: boolean; d: boolean; icon: LucideIcon };

const DAYS: Day[] = [
  { date: "Mon 11", b: true, l: true, d: false, icon: Coffee },
  { date: "Sun 10", b: true, l: true, d: true, icon: Soup },
  { date: "Sat 09", b: false, l: true, d: true, icon: Utensils },
  { date: "Fri 08", b: true, l: true, d: true, icon: Soup },
];

export function AttendanceHistory() {
  return (
    <section className="mt-7">
      <SectionHeader
        title="Attendance history"
        action={<button className="text-xs font-medium text-primary">View all</button>}
      />
      <div
        className="overflow-hidden rounded-2xl border border-border bg-card"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {DAYS.map((d, i) => (
          <div
            key={d.date}
            className={`flex items-center justify-between px-4 py-3 ${
              i !== DAYS.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-foreground">
                <d.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{d.date}</p>
                <p className="text-[11px] text-muted-foreground">B · L · D</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {[d.b, d.l, d.d].map((m, idx) => (
                <span
                  key={idx}
                  className={`h-2.5 w-2.5 rounded-full ${
                    m ? "bg-success" : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
