import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/mess/top-bar";
import { BalanceHero } from "@/components/mess/balance-hero";
import { QrScanner } from "@/components/mess/qr-scanner";
import { StatusCards } from "@/components/mess/status-cards";
import { QuickActions } from "@/components/mess/quick-actions";
import { AttendanceHistory } from "@/components/mess/attendance-history";
import { PaymentHistory } from "@/components/mess/payment-history";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mess Portal — Hostel Student Dashboard" },
      {
        name: "description",
        content:
          "Scan, pay, and track your hostel mess attendance and balance from one beautiful mobile-first portal.",
      },
    ],
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
        <AttendanceHistory />
        <PaymentHistory />
      </div>
    </div>
  );
}
