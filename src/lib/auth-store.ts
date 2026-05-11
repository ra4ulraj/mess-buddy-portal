import { useEffect, useState, useSyncExternalStore } from "react";

export type Role = "student" | "admin";

export type AuthUser = {
  id: string;
  role: Role;
  name: string;
  /** Student registration / roll number */
  rollNo?: string;
  email?: string;
  phone?: string;
};

type Account = {
  id: string;
  role: Role;
  name: string;
  rollNo?: string;
  email?: string;
  phone?: string;
  password: string;
};

type AuthState = {
  hydrated: boolean;
  user: AuthUser | null;
  accounts: Account[];
  /** sentMs -> phone mapping for OTP demo flow */
  pendingOtp: { phone: string; code: string; sentAt: number } | null;
};

const KEY = "mess-auth-v1";

const DEMO_ACCOUNTS: Account[] = [
  {
    id: "stu-demo",
    role: "student",
    name: "Rahul Raj",
    rollNo: "25104131033",
    phone: "9876543210",
    password: "Rahulraj@",
  },
  {
    id: "admin-demo",
    role: "admin",
    name: "Mess Admin",
    email: "admin@messmate.com",
    password: "admin@123",
  },
];

const DEFAULT: AuthState = {
  hydrated: false,
  user: null,
  accounts: DEMO_ACCOUNTS,
  pendingOtp: null,
};

let state: AuthState = DEFAULT;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}
function persist() {
  if (typeof window === "undefined") return;
  const { hydrated, ...rest } = state;
  void hydrated;
  localStorage.setItem(KEY, JSON.stringify(rest));
}
function loadOnce() {
  if (state.hydrated || typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AuthState>;
      const accounts = parsed.accounts ?? [];
      // Merge demo accounts so they always exist
      const merged = [...accounts];
      for (const d of DEMO_ACCOUNTS) {
        if (!merged.find((a) => a.id === d.id)) merged.push(d);
      }
      state = {
        ...DEFAULT,
        ...parsed,
        accounts: merged,
        hydrated: true,
      };
    } else {
      state = { ...DEFAULT, hydrated: true };
    }
  } catch {
    state = { ...DEFAULT, hydrated: true };
  }
}

export function useAuthStore() {
  const snap = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => DEFAULT,
  );
  const [, setReady] = useState(false);
  useEffect(() => {
    if (!state.hydrated) {
      loadOnce();
      setReady(true);
      emit();
    }
  }, []);
  return snap;
}

function toUser(a: Account): AuthUser {
  return {
    id: a.id,
    role: a.role,
    name: a.name,
    rollNo: a.rollNo,
    email: a.email,
    phone: a.phone,
  };
}

export function loginStudent(rollNo: string, password: string): AuthUser {
  loadOnce();
  const acc = state.accounts.find(
    (a) => a.role === "student" && a.rollNo?.toLowerCase() === rollNo.trim().toLowerCase(),
  );
  if (!acc) throw new Error("No student found with that registration number");
  if (acc.password !== password) throw new Error("Incorrect password");
  const user = toUser(acc);
  state = { ...state, user };
  persist();
  emit();
  return user;
}

export function loginAdmin(email: string, password: string): AuthUser {
  loadOnce();
  const acc = state.accounts.find(
    (a) => a.role === "admin" && a.email?.toLowerCase() === email.trim().toLowerCase(),
  );
  if (!acc) throw new Error("Admin account not found");
  if (acc.password !== password) throw new Error("Incorrect password");
  const user = toUser(acc);
  state = { ...state, user };
  persist();
  emit();
  return user;
}

export function requestOtp(phone: string): string {
  loadOnce();
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 10) throw new Error("Enter a valid 10-digit phone");
  const code = String(Math.floor(1000 + Math.random() * 9000));
  state = { ...state, pendingOtp: { phone: cleaned, code, sentAt: Date.now() } };
  persist();
  emit();
  return code;
}

export function verifyOtp(phone: string, code: string): AuthUser {
  loadOnce();
  const cleaned = phone.replace(/\D/g, "");
  const otp = state.pendingOtp;
  if (!otp || otp.phone !== cleaned) throw new Error("No OTP requested for this number");
  if (Date.now() - otp.sentAt > 5 * 60_000) throw new Error("OTP expired");
  if (otp.code !== code.trim()) throw new Error("Incorrect OTP");
  let acc = state.accounts.find((a) => a.role === "student" && a.phone === cleaned);
  if (!acc) {
    // Auto-provision a student tied to this phone
    acc = {
      id: `stu-${cleaned}`,
      role: "student",
      name: `Student ${cleaned.slice(-4)}`,
      rollNo: `OTP${cleaned.slice(-6)}`,
      phone: cleaned,
      password: code,
    };
    state = { ...state, accounts: [...state.accounts, acc] };
  }
  const user = toUser(acc);
  state = { ...state, user, pendingOtp: null };
  persist();
  emit();
  return user;
}

export function signupStudent(input: {
  name: string;
  rollNo: string;
  phone: string;
  password: string;
}): AuthUser {
  loadOnce();
  const rollNo = input.rollNo.trim();
  if (state.accounts.some((a) => a.rollNo?.toLowerCase() === rollNo.toLowerCase())) {
    throw new Error("An account with that registration already exists");
  }
  const acc: Account = {
    id: `stu-${rollNo}`,
    role: "student",
    name: input.name.trim(),
    rollNo,
    phone: input.phone.replace(/\D/g, ""),
    password: input.password,
  };
  const user = toUser(acc);
  state = { ...state, accounts: [...state.accounts, acc], user };
  persist();
  emit();
  return user;
}

export function resetPassword(rollNo: string, newPassword: string): void {
  loadOnce();
  const idx = state.accounts.findIndex(
    (a) => a.rollNo?.toLowerCase() === rollNo.trim().toLowerCase(),
  );
  if (idx === -1) throw new Error("No account with that registration");
  const accounts = state.accounts.slice();
  accounts[idx] = { ...accounts[idx], password: newPassword };
  state = { ...state, accounts };
  persist();
  emit();
}

export function logout() {
  loadOnce();
  state = { ...state, user: null };
  persist();
  emit();
}

export function getCurrentUser(): AuthUser | null {
  loadOnce();
  return state.user;
}