import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ChefHat } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { syncForUser } from "@/lib/mess-store";

const PUBLIC_PATHS = new Set(["/login", "/signup", "/forgot-password"]);

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, hydrated } = useAuthStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    void syncForUser(user?.id ?? null);
  }, [user?.id]);

  useEffect(() => {
    if (!hydrated || showSplash) return;
    const isPublic = PUBLIC_PATHS.has(pathname);
    if (!user && !isPublic) {
      navigate({ to: "/login", replace: true });
    } else if (user && isPublic) {
      navigate({ to: user.role === "admin" ? "/admin" : "/", replace: true });
    } else if (user?.role !== "admin" && pathname === "/admin") {
      navigate({ to: "/", replace: true });
    }
  }, [user, hydrated, pathname, showSplash, navigate]);

  return (
    <>
      {children}
      <AnimatePresence>
        {(showSplash || !hydrated) && <Splash />}
      </AnimatePresence>
    </>
  );
}

function Splash() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[100] grid place-items-center bg-background"
    >
      <div className="flex flex-col items-center gap-5">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="grid h-20 w-20 place-items-center rounded-3xl text-white"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          <ChefHat className="h-9 w-9" />
        </motion.div>
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-center"
        >
          <p className="text-xl font-semibold tracking-tight text-foreground">MessMate</p>
          <p className="mt-1 text-xs text-muted-foreground">Smart hostel mess portal</p>
        </motion.div>
        <div className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-secondary">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
            className="h-full w-1/2 rounded-full"
            style={{ background: "var(--gradient-primary)" }}
          />
        </div>
      </div>
    </motion.div>
  );
}