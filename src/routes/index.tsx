import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/mess/top-bar";
import { BalanceHero } from "@/components/mess/balance-hero";
import { QrScanner } from "@/components/mess/qr-scanner";
import { StatusCards } from "@/components/mess/status-cards";
import { QuickActions } from "@/components/mess/quick-actions";
import { AttendanceHistory } from "@/components/mess/attendance-history";
import { AttendanceSummary } from "@/components/mess/attendance-summary";
import { PaymentHistory } from "@/components/mess/payment-history";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — MessMate Hostel Mess Portal" },
      {
        name: "description",
        content:
          "Scan QR for breakfast, lunch and dinner, track your mess attendance, view payment history, and recharge your wallet — all from your MessMate student dashboard.",
      },
      { property: "og:title", content: "Dashboard — MessMate" },
      {
        property: "og:description",
        content:
          "Scan QR for meals, track hostel mess attendance, view payment history, and recharge your wallet from one mobile-first dashboard.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: MessPortal,
});

function MessPortal() {
  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="mx-auto max-w-md px-5 sm:max-w-lg">
        <TopBar />
        <BalanceHero />
        <QrScanner />
        <StatusCards />
        <QuickActions />
        <AttendanceSummary />
        <AttendanceHistory />
        <PaymentHistory />
      </div>
    </div>
  );
}
