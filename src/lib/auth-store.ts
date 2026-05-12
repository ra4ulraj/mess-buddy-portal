import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Role = "student" | "admin";
export type AuthUser = {
  id: string;
  role: Role;
  name: string;
  rollNo?: string;
  email?: string;
  phone?: string;
};

type State = {
  hydrated: boolean;
  user: AuthUser | null;
  loading: boolean;
};

const STUDENT_DOMAIN = "messmate.local";
const rollToEmail = (roll: string) =>
  `${roll.trim().toLowerCase()}@${STUDENT_DOMAIN}`;

// Demo accounts: auto-provisioned on first login attempt
const DEMOS = [
  {
    match: (email: string, pw: string) =>
      email === rollToEmail("25104131033") && pw === "Rahulraj@",
    email: rollToEmail("25104131033"),
    password: "Rahulraj@",
    metadata: {
      name: "Rahul Raj",
      roll_number: "25104131033",
      role: "student",
      balance: "2480",
      hostel: "Sarayu Hostel",
      meal_plan: "Veg Premium",
    },
  },
  {
    match: (email: string, pw: string) =>
      email === "admin@messmate.com" && pw === "admin@123",
    email: "admin@messmate.com",
    password: "admin@123",
    metadata: { name: "Mess Admin", role: "admin" },
  },
];

let state: State = { hydrated: false, user: null, loading: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  emit();
}

async function loadRoleAndProfile(
  userId: string,
  email: string | undefined,
): Promise<AuthUser> {
  const [{ data: roleRow }, { data: profile }] = await Promise.all([
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("name, roll_number")
      .eq("id", userId)
      .maybeSingle(),
  ]);
  const role: Role = (roleRow?.role as Role) ?? "student";
  return {
    id: userId,
    role,
    name: profile?.name ?? email?.split("@")[0] ?? "Student",
    rollNo: profile?.roll_number ?? undefined,
    email,
  };
}

let initialized = false;
async function initOnce() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
      setState({ user: null, hydrated: true });
      return;
    }
    // defer profile fetch to avoid deadlock inside callback
    setTimeout(async () => {
      try {
        const u = await loadRoleAndProfile(session.user.id, session.user.email);
        setState({ user: u, hydrated: true });
      } catch (err) {
        console.error("auth profile load failed", err);
        setState({ hydrated: true });
      }
    }, 0);
  });

  const { data } = await supabase.auth.getSession();
  if (data.session?.user) {
    try {
      const u = await loadRoleAndProfile(
        data.session.user.id,
        data.session.user.email,
      );
      setState({ user: u, hydrated: true });
    } catch {
      setState({ hydrated: true });
    }
  } else {
    setState({ hydrated: true });
  }
}

export function useAuthStore() {
  const snap = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
  const [, force] = useState(0);
  useEffect(() => {
    void initOnce().then(() => force((n) => n + 1));
  }, []);
  return snap;
}

async function trySignIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

async function ensureDemoSeeded(email: string, password: string) {
  const demo = DEMOS.find((d) => d.match(email, password));
  if (!demo) return false;
  const { error } = await supabase.auth.signUp({
    email: demo.email,
    password: demo.password,
    options: { data: demo.metadata },
  });
  if (error && !/already|registered/i.test(error.message)) throw error;
  return true;
}

export async function loginStudent(rollNo: string, password: string): Promise<AuthUser> {
  const email = rollToEmail(rollNo);
  try {
    await trySignIn(email, password);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/invalid login/i.test(msg)) {
      const seeded = await ensureDemoSeeded(email, password);
      if (seeded) {
        await trySignIn(email, password);
      } else {
        throw new Error("Invalid registration number or password");
      }
    } else {
      throw err;
    }
  }
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Login failed");
  const u = await loadRoleAndProfile(data.user.id, data.user.email);
  setState({ user: u });
  return u;
}

export async function loginAdmin(email: string, password: string): Promise<AuthUser> {
  const e = email.trim().toLowerCase();
  try {
    await trySignIn(e, password);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/invalid login/i.test(msg)) {
      const seeded = await ensureDemoSeeded(e, password);
      if (seeded) {
        await trySignIn(e, password);
      } else {
        throw new Error("Invalid email or password");
      }
    } else {
      throw err;
    }
  }
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Login failed");
  const u = await loadRoleAndProfile(data.user.id, data.user.email);
  if (u.role !== "admin") {
    await supabase.auth.signOut();
    throw new Error("This account does not have admin access");
  }
  setState({ user: u });
  return u;
}

export async function signupStudent(input: {
  name: string;
  rollNo: string;
  phone: string;
  password: string;
}): Promise<AuthUser> {
  const email = rollToEmail(input.rollNo);
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        name: input.name.trim(),
        roll_number: input.rollNo.trim(),
        phone: input.phone.replace(/\D/g, ""),
        role: "student",
      },
    },
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Signup failed");
  // session may already exist if email auto-confirm is on
  const u = await loadRoleAndProfile(data.user.id, email);
  setState({ user: u });
  return u;
}

export function requestOtp(_phone: string): string {
  throw new Error("Phone login is coming soon. Please use registration number.");
}
export function verifyOtp(_phone: string, _code: string): AuthUser {
  throw new Error("Phone login is coming soon.");
}
export async function resetPassword(_rollNo: string, _newPassword: string) {
  throw new Error("Password reset is coming soon. Contact your mess admin.");
}

export async function logout() {
  await supabase.auth.signOut();
  setState({ user: null });
}

export function getCurrentUser(): AuthUser | null {
  return state.user;
}
