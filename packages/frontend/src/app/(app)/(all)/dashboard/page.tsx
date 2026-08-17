import type { Metadata } from "next";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard" };

const summary = [
  { label: "Resume views", value: "0" },
  { label: "Unique viewers", value: "0" },
  { label: "Downloads", value: "0" },
  { label: "Download rate", value: "—" },
] as const;

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Views, unique viewers and downloads across every resume you track. Aggregate only: Milo never records who opened anything."
        action={<Button href="/links">Create a link</Button>}
      />

      <dl className="mt-10 grid gap-px overflow-hidden rounded-card border border-sand-300/12 bg-sand-300/10 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((card) => (
          <div key={card.label} className="bg-ink-900 px-5 py-6">
            <dt className="text-xs tracking-wide text-sand-700">{card.label}</dt>
            <dd className="mt-2 font-display text-4xl text-sand-50">{card.value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <Panel title="Traffic sources" className="lg:col-span-2">
          <EmptyState
            title="Nothing to attribute yet"
            description="Once a tracking link is opened, this shows where the traffic came from: LinkedIn, a portfolio, an email, or direct."
            className="border-0 bg-transparent px-0 py-8"
          />
        </Panel>

        <Panel title="Page engagement">
          <EmptyState
            title="No pages read yet"
            description="Per-page attention appears here after the first view."
            className="border-0 bg-transparent px-0 py-8"
          />
        </Panel>
      </section>

      <section className="mt-8">
        <Panel title="Recent activity">
          <EmptyState
            title="No activity"
            description="Create a tracking link and share it. Opens and downloads land here as they happen."
            action={<Button href="/links">Create a link</Button>}
            className="border-0 bg-transparent px-0 py-8"
          />
        </Panel>
      </section>
    </div>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-card border border-sand-300/12 bg-ink-900/60 p-5 ${className ?? ""}`}>
      <h2 className="font-mono text-[11px] tracking-[0.18em] text-sand-700 uppercase">{title}</h2>
      {children}
    </div>
  );
}
