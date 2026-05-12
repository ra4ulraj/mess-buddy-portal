import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  AuthShell,
  ErrorText,
  FieldLabel,
  PrimaryButton,
} from "@/components/auth/auth-shell";
import { signupStudent } from "@/lib/auth-store";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — MessMate" },
      { name: "description", content: "Sign up for the hostel mess portal." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("Enter your full name");
    if (rollNo.trim().length < 4) return setError("Enter a valid registration");
    if (phone.replace(/\D/g, "").length !== 10) return setError("Enter a 10-digit phone");
    if (password.length < 6) return setError("Password must be at least 6 characters");
    if (password !== confirm) return setError("Passwords do not match");
    setLoading(true);
    try {
      const u = await signupStudent({ name, rollNo, phone, password });
      toast.success(`Welcome, ${u.name}`);
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join your hostel mess in under a minute"
      footer={
        <>
          Already have one?{" "}
          <Link to="/login" className="font-semibold text-primary">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <FieldLabel>Full name</FieldLabel>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Aarav Reddy"
            className="h-12 rounded-2xl"
          />
        </div>
        <div>
          <FieldLabel>Registration No.</FieldLabel>
          <Input
            value={rollNo}
            onChange={(e) => setRollNo(e.target.value)}
            placeholder="25104131XXX"
            className="h-12 rounded-2xl"
          />
        </div>
        <div>
          <FieldLabel>Mobile</FieldLabel>
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Password</FieldLabel>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6+ chars"
                className="h-12 rounded-2xl pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <FieldLabel>Confirm</FieldLabel>
            <Input
              type={showPw ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat"
              className="h-12 rounded-2xl"
            />
          </div>
        </div>
        <ErrorText>{error}</ErrorText>
        <PrimaryButton type="submit" loading={loading}>
          Create account
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}