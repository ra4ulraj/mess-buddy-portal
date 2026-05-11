import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, KeyRound, Phone, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  AuthShell,
  ErrorText,
  FieldLabel,
  PrimaryButton,
} from "@/components/auth/auth-shell";
import {
  loginAdmin,
  loginStudent,
  requestOtp,
  useAuthStore,
  verifyOtp,
} from "@/lib/auth-store";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — MessMate" },
      { name: "description", content: "Login to your hostel mess portal." },
    ],
  }),
  component: LoginPage,
});

type Tab = "student" | "phone" | "admin";

function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>("student");

  if (user) {
    queueMicrotask(() => navigate({ to: user.role === "admin" ? "/admin" : "/" }));
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue to your mess portal"
      footer={
        <>
          New here?{" "}
          <Link to="/signup" className="font-semibold text-primary">
            Create an account
          </Link>
        </>
      }
    >
      <div className="mb-5 grid grid-cols-3 gap-1 rounded-2xl bg-secondary p-1">
        {(
          [
            { id: "student", label: "Roll", icon: User },
            { id: "phone", label: "Phone", icon: Phone },
            { id: "admin", label: "Admin", icon: ShieldCheck },
          ] as { id: Tab; label: string; icon: typeof User }[]
        ).map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition"
              style={
                active
                  ? {
                      background: "var(--gradient-primary)",
                      color: "var(--primary-foreground)",
                      boxShadow: "var(--shadow-glow)",
                    }
                  : { color: "var(--muted-foreground)" }
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "student" && <StudentForm />}
      {tab === "phone" && <PhoneForm />}
      {tab === "admin" && <AdminForm />}

      <DemoHint tab={tab} />
    </AuthShell>
  );
}

function DemoHint({ tab }: { tab: Tab }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/60 p-3 text-[11px] text-muted-foreground">
      <p className="font-semibold text-foreground">Demo accounts</p>
      {tab === "admin" ? (
        <p className="mt-1">Email: admin@messmate.com · Pass: admin@123</p>
      ) : (
        <p className="mt-1">Reg: 25104131033 · Pass: Rahulraj@</p>
      )}
    </div>
  );
}

function StudentForm() {
  const navigate = useNavigate();
  const [rollNo, setRollNo] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!rollNo.trim()) return setError("Enter your registration number");
    if (!password) return setError("Enter your password");
    setLoading(true);
    setTimeout(() => {
      try {
        const u = loginStudent(rollNo, password);
        toast.success(`Welcome, ${u.name}`);
        navigate({ to: "/" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed");
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <FieldLabel>Registration No.</FieldLabel>
        <Input
          value={rollNo}
          onChange={(e) => setRollNo(e.target.value)}
          placeholder="25104131033"
          autoComplete="username"
          className="h-12 rounded-2xl"
        />
      </div>
      <div>
        <FieldLabel>Password</FieldLabel>
        <div className="relative">
          <Input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            className="h-12 rounded-2xl pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-label="Toggle password"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-2 text-right">
          <Link to="/forgot-password" className="text-xs font-semibold text-primary">
            Forgot password?
          </Link>
        </div>
      </div>
      <ErrorText>{error}</ErrorText>
      <PrimaryButton loading={loading} type="submit">
        Sign in
      </PrimaryButton>
    </form>
  );
}

function PhoneForm() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      try {
        const code = requestOtp(phone);
        toast.success("OTP sent", { description: `Demo code: ${code}` });
        setStep("otp");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not send OTP");
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      try {
        const u = verifyOtp(phone, otp);
        toast.success(`Welcome, ${u.name}`);
        navigate({ to: "/" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Verification failed");
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  if (step === "phone") {
    return (
      <form onSubmit={send} className="space-y-4">
        <div>
          <FieldLabel>Mobile number</FieldLabel>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              +91
            </span>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
              inputMode="numeric"
              maxLength={10}
              className="h-12 rounded-2xl pl-12"
            />
          </div>
        </div>
        <ErrorText>{error}</ErrorText>
        <PrimaryButton type="submit" loading={loading}>
          Send OTP
        </PrimaryButton>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-4">
      <div>
        <FieldLabel>Enter OTP</FieldLabel>
        <Input
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="4-digit code"
          inputMode="numeric"
          className="h-14 rounded-2xl text-center text-2xl tracking-[0.6em]"
        />
        <p className="mt-2 text-xs text-muted-foreground">Sent to +91 {phone}</p>
      </div>
      <ErrorText>{error}</ErrorText>
      <PrimaryButton type="submit" loading={loading}>
        Verify & continue
      </PrimaryButton>
      <button
        type="button"
        onClick={() => setStep("phone")}
        className="mx-auto block text-xs font-semibold text-primary"
      >
        Change number
      </button>
    </form>
  );
}

function AdminForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      try {
        loginAdmin(email, password);
        toast.success("Admin signed in");
        navigate({ to: "/admin" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed");
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <FieldLabel>Admin email</FieldLabel>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@messmate.com"
          className="h-12 rounded-2xl"
        />
      </div>
      <div>
        <FieldLabel>Password</FieldLabel>
        <div className="relative">
          <Input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-12 rounded-2xl pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-label="Toggle password"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <ErrorText>{error}</ErrorText>
      <PrimaryButton type="submit" loading={loading}>
        Enter admin panel
      </PrimaryButton>
    </form>
  );
}