import { Link, useLocation } from "@tanstack/react-router";
import { Home, Settings, ShieldCheck, User } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";

const TABS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/admin", label: "Admin", icon: ShieldCheck },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const HIDDEN_ON = new Set(["/login", "/signup", "/forgot-password"]);

export function BottomNav() {
  const { pathname } = useLocation();
  const { user } = useAuthStore();
  if (HIDDEN_ON.has(pathname) || !user) return null;
  const tabs = TABS.filter((t) => t.to !== "/admin" || user.role === "admin");
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md items-center justify-around border-t border-border bg-card/80 px-2 py-2 backdrop-blur-xl sm:max-w-lg"
      style={{
        boxShadow: "0 -10px 30px -10px oklch(0.2 0.05 240 / 0.18)",
        paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)",
      }}
    >
      {tabs.map((t) => {
        const active = pathname === t.to;
        const Icon = t.icon;
        return (
          <Link
            key={t.to}
            to={t.to}
            className="relative flex flex-1 flex-col items-center gap-1 py-1.5 text-[11px] font-medium transition-colors"
            style={{
              color: active ? "var(--primary)" : "var(--muted-foreground)",
            }}
          >
            <span
              className="grid h-9 w-9 place-items-center rounded-2xl transition-all"
              style={
                active
                  ? {
                      background: "var(--gradient-primary)",
                      color: "var(--primary-foreground)",
                      boxShadow: "var(--shadow-glow)",
                    }
                  : undefined
              }
            >
              <Icon className="h-4 w-4" />
            </span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
