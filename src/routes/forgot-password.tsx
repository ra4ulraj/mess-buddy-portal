import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  AuthShell,
  ErrorText,
  FieldLabel,
  PrimaryButton,
} from "@/components/auth/auth-shell";
import { resetPassword } from "@/lib/auth-store";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — MessMate" },
      { name: "description", content: "Reset your mess portal password." },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const navigate = useNavigate();
  const [rollNo, setRollNo] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!rollNo.trim()) return setError("Enter your registration");
    if (pw.length < 6) return setError("Password must be at least 6 characters");
    if (pw !== confirm) return setError("Passwords do not match");
    setLoading(true);
    try {
      await resetPassword(rollNo, pw);
      toast.success("Password updated", { description: "You can sign in now." });
      navigate({ to: "/login" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Set a new password using your registration number"
      footer={
        <Link to="/login" className="font-semibold text-primary">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <FieldLabel>Registration No.</FieldLabel>
          <Input
            value={rollNo}
            onChange={(e) => setRollNo(e.target.value)}
            placeholder="25104131033"
            className="h-12 rounded-2xl"
          />
        </div>
        <div>
          <FieldLabel>New password</FieldLabel>
          <Input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="6+ characters"
            className="h-12 rounded-2xl"
          />
        </div>
        <div>
          <FieldLabel>Confirm new password</FieldLabel>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat"
            className="h-12 rounded-2xl"
          />
        </div>
        <ErrorText>{error}</ErrorText>
        <PrimaryButton type="submit" loading={loading}>
          Update password
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}