import { motion } from "framer-motion";
import { Bell, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import { useMessStore } from "@/lib/mess-store";
import { unreadCount, useNotificationsStore } from "@/lib/notifications-store";
import { NotificationsDrawer } from "./notifications-drawer";

export function TopBar() {
  const { theme, toggle } = useTheme();
  const { student } = useMessStore();
  const { items } = useNotificationsStore();
  const [open, setOpen] = useState(false);
  const unread = unreadCount(items);
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center justify-between pt-6"
    >
      <div className="flex items-center gap-3">
        <div
          className="relative h-11 w-11 rounded-full p-[2px]"
          style={{ background: "var(--gradient-primary)" }}
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-card text-sm font-semibold text-foreground">
            {student.initials}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Welcome back</p>
          <h1 className="text-base font-semibold text-foreground">
            {student.name}
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card transition-transform active:scale-95"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5 text-foreground" />
          ) : (
            <Moon className="h-5 w-5 text-foreground" />
          )}
        </button>
        <button
          aria-label="Notifications"
          onClick={() => setOpen(true)}
          className="relative grid h-11 w-11 place-items-center rounded-full border border-border bg-card transition-transform active:scale-95"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <Bell className="h-5 w-5 text-foreground" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </div>
      <NotificationsDrawer open={open} onClose={() => setOpen(false)} />
    </motion.header>
  );
}
