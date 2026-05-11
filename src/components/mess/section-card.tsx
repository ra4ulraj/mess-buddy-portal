import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

export function SectionCard({ children, className = "", padded = true }: Props) {
  return (
    <div
      className={`rounded-3xl border border-border bg-card ${padded ? "p-5" : ""} ${className}`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {children}
    </div>
  );
}

interface HeaderProps {
  title: string;
  action?: ReactNode;
}

export function SectionHeader({ title, action }: HeaderProps) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {action}
    </div>
  );
}
