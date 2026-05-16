import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  Megaphone,
  Utensils,
  X,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  markAllRead,
  markRead,
  unreadCount,
  useNotificationsStore,
  type NotificationKind,
  type NotificationRecord,
} from "@/lib/notifications-store";

const ICONS: Record<NotificationKind, typeof Bell> = {
  meal: Utensils,
  due: AlertTriangle,
  admin: Megaphone,
  system: Bell,
};

const TINTS: Record<NotificationKind, string> = {
  meal: "var(--gradient-success)",
  due: "var(--gradient-danger)",
  admin: "var(--gradient-primary)",
  system: "var(--gradient-warning)",
};

function fmt(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
}

export function NotificationsDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { items, loading, hydrated } = useNotificationsStore();
  const navigate = useNavigate();
  const unread = unreadCount(items);

  function handleClick(n: NotificationRecord) {
    if (!n.read) void markRead(n.id);
    if (n.link) {
      onClose();
      navigate({ to: n.link as never });
    }
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
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-border bg-card sm:rounded-3xl"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Inbox
                </p>
                <h3 className="text-base font-semibold text-foreground">
                  Notifications{" "}
                  {unread > 0 && (
                    <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                      {unread}
                    </span>
                  )}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    onClick={() => void markAllRead()}
                    className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold text-foreground"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all
                  </button>
                )}
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!hydrated || (loading && items.length === 0) ? (
                <div className="grid place-items-center py-16 text-sm text-muted-foreground">
                  Syncing…
                </div>
              ) : items.length === 0 ? (
                <div className="grid place-items-center gap-2 py-16 text-center">
                  <span
                    className="grid h-14 w-14 place-items-center rounded-2xl text-white"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    <Bell className="h-6 w-6" />
                  </span>
                  <p className="text-sm font-semibold text-foreground">
                    You're all caught up
                  </p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    Meal reminders, due alerts and admin messages will show up
                    here.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {items.map((n, i) => {
                    const Icon = ICONS[n.kind];
                    return (
                      <motion.li
                        key={n.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.2) }}
                      >
                        <button
                          onClick={() => handleClick(n)}
                          className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors ${
                            n.read
                              ? "border-border bg-card"
                              : "border-primary/30 bg-primary/5"
                          }`}
                        >
                          <span
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white"
                            style={{ background: TINTS[n.kind] }}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-foreground">
                                {n.title}
                              </p>
                              {!n.read && (
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                              )}
                            </div>
                            {n.body && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {n.body}
                              </p>
                            )}
                            <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/80">
                              {fmt(n.ts)} · {n.kind}
                            </p>
                          </div>
                        </button>
                      </motion.li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}