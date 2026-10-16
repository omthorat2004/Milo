import type { Metadata } from "next";

import { AccountDashboard } from "@/components/app/account-dashboard";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Views, unique viewers and downloads across every resume you track. Aggregate only: Milo never records who opened anything."
        action={<Button href="/links/new">Create a link</Button>}
      />

      <AccountDashboard />
    </div>
  );
}
