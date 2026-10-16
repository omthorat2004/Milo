"use client";

import Link from "next/link";

import { AnalyticsPanels } from "@/components/app/analytics-panels";
import { CopyLinkButton } from "@/components/app/copy-link-button";
import { EmptyState } from "@/components/app/empty-state";
import { LinkStatusBadge } from "@/components/app/link-status-badge";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { computeSummary, formatRelativeTime } from "@/lib/links-analytics";
import { useLinksStore } from "@/stores/links-store";

export function LinkDashboard({ linkId }: { linkId: string }) {
  const link = useLinksStore((state) => state.links.find((candidate) => candidate.id === linkId));
  const events = useLinksStore((state) => state.events.filter((event) => event.linkId === linkId));

  if (!link) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <PageHeader eyebrow="Not found" title="Dashboard" />
        <EmptyState
          title="This link doesn't exist"
          description="It may have been deleted. Here's the full list of what's left."
          action={<Button href="/links">Back to links</Button>}
          className="mt-10"
        />
      </div>
    );
  }

  const summary = computeSummary(events);
  const lastEvent = [...events].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  )[0];

  const summaryCards = [
    { label: "Resume views", value: String(summary.views) },
    { label: "Unique viewers", value: String(summary.uniqueViewers) },
    { label: "Downloads", value: String(summary.downloads) },
    {
      label: "Download rate",
      value: summary.downloadRate === null ? "—" : `${Math.round(summary.downloadRate * 100)}%`,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow={`Resume · ${link.label}`}
        title="Dashboard"
        description="Views, unique viewers and downloads for this link only. Aggregate only: Milo never records who opened it."
        action={
          <div className="flex items-center gap-2">
            <LinkStatusBadge status={link.status} />
            <CopyLinkButton value={`milo.link/go/${link.slug}`} />
          </div>
        }
      />

      <dl className="mt-10 grid gap-px overflow-hidden rounded-card border border-surface-border bg-surface-border sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-surface px-5 py-6">
            <dt className="text-xs tracking-wide text-foreground-muted">{card.label}</dt>
            <dd className="mt-2 font-display text-4xl text-foreground">{card.value}</dd>
          </div>
        ))}
      </dl>

      <AnalyticsPanels events={events} />

      <section className="mt-8 rounded-card border border-surface-border bg-surface/60 p-5">
        <h2 className="font-mono text-[11px] tracking-[0.18em] text-foreground-muted uppercase">
          Recent activity
        </h2>
        {lastEvent ? (
          <p className="mt-4 text-sm text-foreground-muted">
            Last activity {formatRelativeTime(lastEvent.occurredAt)}. See{" "}
            <Link href={`/${link.id}/logs`} className="text-signal-400 hover:underline">
              the full log
            </Link>{" "}
            for every event.
          </p>
        ) : (
          <EmptyState
            title="No activity"
            description="Share this link and opens or downloads will land here as they happen."
            className="mt-4 border-0 bg-transparent px-0 py-8"
          />
        )}
      </section>
    </div>
  );
}
