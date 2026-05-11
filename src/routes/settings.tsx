import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Bell, Globe, Moon, RefreshCw, Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/use-theme";
import { resetStore, updateSettings, useMessStore } from "@/lib/mess-store";
import { SectionCard } from "@/components/mess/section-card";

const LANGUAGES = ["English", "हिन्दी", "தமிழ்", "తెలుగు"] as const;

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Mess Portal" },
      { name: "description", content: "Theme, notifications and app preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings } = useMessStore();
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="mx-auto max-w-md px-5 pt-6 sm:max-w-lg">
        <header className="flex items-center gap-3">
          <Link
            to="/"
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </Link>
          <div>
            <p className="text-xs text-muted-foreground">Preferences</p>
            <h1 className="text-base font-semibold text-foreground">Settings</h1>
          </div>
        </header>

        <SectionCard className="mt-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Appearance</h3>
          <Row
            icon={Moon}
            tint="var(--gradient-hero)"
            title="Dark mode"
            sub="Match your system at night"
            control={
              <Switch
                checked={theme === "dark"}
                onCheckedChange={() => toggle()}
              />
            }
          />
        </SectionCard>

        <SectionCard className="mt-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Notifications</h3>
          <Row
            icon={Bell}
            tint="var(--gradient-primary)"
            title="Push notifications"
            sub="Meal alerts & payment updates"
            control={
              <Switch
                checked={settings.notifications}
                onCheckedChange={(v) => {
                  updateSettings({ notifications: v });
                  toast(v ? "Notifications on" : "Notifications muted");
                }}
              />
            }
          />
          <div className="mt-3 border-t border-border pt-3">
            <Row
              icon={Sparkles}
              tint="var(--gradient-success)"
              title="Weekly reports"
              sub="Get a Sunday recap of your meals"
              control={
                <Switch
                  checked={settings.weeklyReports}
                  onCheckedChange={(v) => updateSettings({ weeklyReports: v })}
                />
              }
            />
          </div>
        </SectionCard>

        <SectionCard className="mt-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">App preferences</h3>
          <Row
            icon={Wallet}
            tint="var(--gradient-warning)"
            title="Auto-credit on low balance"
            sub="Allow meals on credit automatically"
            control={
              <Switch
                checked={settings.autoCredit}
                onCheckedChange={(v) => updateSettings({ autoCredit: v })}
              />
            }
          />
          <div className="mt-3 border-t border-border pt-3">
            <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              Language
            </p>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map((l) => {
                const active = settings.language === l;
                return (
                  <button
                    key={l}
                    onClick={() => {
                      updateSettings({ language: l });
                      toast(`Language set to ${l}`);
                    }}
                    className={`rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary text-foreground"
                    }`}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          </div>
        </SectionCard>

        <SectionCard className="mt-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Data</h3>
          <button
            onClick={() => {
              resetStore();
              toast.success("App reset", { description: "Mock data restored." });
            }}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-secondary px-4 py-3"
          >
            <span className="flex items-center gap-3 text-sm font-medium text-foreground">
              <span
                className="grid h-9 w-9 place-items-center rounded-xl text-white"
                style={{ background: "var(--gradient-danger)" }}
              >
                <RefreshCw className="h-4 w-4" />
              </span>
              Reset app data
            </span>
            <span className="text-[11px] text-muted-foreground">Mock</span>
          </button>
        </SectionCard>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Mess Portal · v1.0 · Made for hostel students
        </p>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  tint,
  title,
  sub,
  control,
}: {
  icon: typeof Bell;
  tint: string;
  title: string;
  sub: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span
          className="grid h-10 w-10 place-items-center rounded-2xl text-white"
          style={{ background: tint }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground">{sub}</p>
        </div>
      </div>
      {control}
    </div>
  );
}
