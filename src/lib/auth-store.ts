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

type Metadata = Record<string, unknown> | null | undefined;

const STUDENT_DOMAIN = "messmate.local";
const rollToEmail = (roll: string) =>
  `${roll.trim().toLowerCase()}@${STUDENT_DOMAIN}`;

// Demo accounts: auto-provisioned on first login attempt when email auto-confirm is enabled.
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

function readString(metadata: Metadata, key: string): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readRole(metadata: Metadata): Role | undefined {
  const value = readString(metadata, "role");
  return value === "admin" || value === "student" ? value : undefined;
}

async function loadRoleAndProfile(
  userId: string,
  email: string | undefined,
  metadata?: Metadata,
): Promise<AuthUser> {
  const [{ data: roleRow, error: roleError }, { data: profile, error: profileError }] =
    await Promise.all([
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

  if (roleError) console.warn("role load failed", roleError.message);
  if (profileError) console.warn("profile load failed", profileError.message);

  const role: Role = (roleRow?.role as Role | undefined) ?? readRole(metadata) ?? "student";
  const name =
    profile?.name ??
    readString(metadata, "name") ??
    email?.split("@")[0] ??
    (role === "admin" ? "Mess Admin" : "Student");

  return {
    id: userId,
    role,
    name,
    rollNo: profile?.roll_number ?? readString(metadata, "roll_number"),
    email,
    phone: readString(metadata, "phone"),
  };
}

let initialized = false;
async function initOnce() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
      setState({ user: null, hydrated: true, loading: false });
      return;
    }

    // Defer profile fetch to avoid a Supabase auth callback deadlock.
    setTimeout(async () => {
      try {
        const u = await loadRoleAndProfile(
          session.user.id,
          session.user.email,
          session.user.user_metadata,
        );
        setState({ user: u, hydrated: true, loading: false });
      } catch (err) {
        console.error("auth profile load failed", err);
        setState({ hydrated: true, loading: false });
      }
    }, 0);
  });

  const { data } = await supabase.auth.getSession();
  if (data.session?.user) {
    try {
      const u = await loadRoleAndProfile(
        data.session.user.id,
        data.session.user.email,
        data.session.user.user_metadata,
      );
      setState({ user: u, hydrated: true, loading: false });
    } catch {
      setState({ hydrated: true, loading: false });
    }
  } else {
    setState({ hydrated: true, loading: false });
  }

  return () => subscription.subscription.unsubscribe();
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
  if (error && !/already|registered|exists/i.test(error.message)) throw error;
  return true;
}

function isInvalidLogin(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return /invalid login|invalid credentials/i.test(msg);
}

export async function loginStudent(rollNo: string, password: string): Promise<AuthUser> {
  const email = rollToEmail(rollNo);
  setState({ loading: true });
  try {
    try {
      await trySignIn(email, password);
    } catch (err) {
      if (isInvalidLogin(err)) {
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
    const u = await loadRoleAndProfile(data.user.id, data.user.email, data.user.user_metadata);
    setState({ user: u, loading: false, hydrated: true });
    return u;
  } catch (err) {
    setState({ loading: false });
    throw err;
  }
}

export async function loginAdmin(email: string, password: string): Promise<AuthUser> {
  const e = email.trim().toLowerCase();
  setState({ loading: true });
  try {
    try {
      await trySignIn(e, password);
    } catch (err) {
      if (isInvalidLogin(err)) {
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
    const u = await loadRoleAndProfile(data.user.id, data.user.email, data.user.user_metadata);
    if (u.role !== "admin") {
      await supabase.auth.signOut();
      throw new Error("This account does not have admin access");
    }
    setState({ user: u, loading: false, hydrated: true });
    return u;
  } catch (err) {
    setState({ loading: false });
    throw err;
  }
}

export async function signupStudent(input: {
  name: string;
  rollNo: string;
  phone: string;
  password: string;
}): Promise<AuthUser> {
  const email = rollToEmail(input.rollNo);
  const metadata = {
    name: input.name.trim(),
    roll_number: input.rollNo.trim(),
    phone: input.phone.replace(/\D/g, ""),
    role: "student",
  };
  setState({ loading: true });
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: { data: metadata },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Signup failed");

    const u = await loadRoleAndProfile(data.user.id, email, data.user.user_metadata ?? metadata);
    setState({ user: data.session ? u : null, loading: false, hydrated: true });
    if (!data.session) {
      throw new Error("Account created. Confirm your email, then sign in.");
    }
    return u;
  } catch (err) {
    setState({ loading: false });
    throw err;
  }
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
  setState({ user: null, loading: false });
}

export function getCurrentUser(): AuthUser | null {
  return state.user;
}
