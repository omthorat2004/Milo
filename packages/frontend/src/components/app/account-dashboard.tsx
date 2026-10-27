"use client";

import Link from "next/link";

import { AnalyticsPanels } from "@/components/app/analytics-panels";
import { EmptyState } from "@/components/app/empty-state";
import { useMyEventsQuery, useMyLinksQuery } from "@/hooks/use-link-queries";
import { computeSummary, formatRelativeTime } from "@/lib/links-analytics";

export function AccountDashboard() {
  const linksQuery = useMyLinksQuery();
  const eventsQuery = useMyEventsQuery();

  const links = linksQuery.data ?? [];
  const events = eventsQuery.data ?? [];

  const summary = computeSummary(events);
  const recent = [...events]
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    .slice(0, 6);

  const summaryCards = [
    { label: "Resume views", value: String(summary.views) },
    { label: "Unique viewers", value: String(summary.uniqueViewers) },
    { label: "Downloads", value: String(summary.downloads) },
    {
      label: "Download rate",
      value: summary.downloadRate === null ? "N/A" : `${Math.round(summary.downloadRate * 100)}%`,
    },
  ];

  function linkTitle(linkId: string): string {
    return links.find((link) => link.id === linkId)?.resume_title ?? "Deleted link";
  }

  return (
    <>
      <dl className="mt-10 grid gap-px overflow-hidden rounded-card border border-surface-border bg-surface-border sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-surface px-5 py-6">
            <dt className="text-xs tracking-wide text-foreground-muted">{card.label}</dt>
            <dd className="mt-2 font-display text-4xl text-foreground">{card.value}</dd>
          </div>
        ))}
      </dl>

      <AnalyticsPanels events={events} />

      <section className="mt-8">
        <div className="rounded-card border border-surface-border bg-surface/60 p-5">
          <h2 className="font-mono text-[11px] tracking-[0.18em] text-foreground-muted uppercase">
            Recent activity
          </h2>

          {recent.length === 0 ? (
            <EmptyState
              title="No activity"
              description="Create a tracking link and share it. Opens and downloads land here as they happen."
              className="mt-4 border-0 bg-transparent px-0 py-8"
            />
          ) : (
            <ul className="mt-4 space-y-3">
              {recent.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm"
                >
                  <span className="min-w-0 truncate text-foreground">
                    {event.event_type === "download" ? "Download" : "View"} ·{" "}
                    <Link href={`/${event.link_id}/dashboard`} className="hover:text-signal-400">
                      {linkTitle(event.link_id)}
                    </Link>
                  </span>
                  <span className="shrink-0 text-foreground-muted">
                    {formatRelativeTime(event.occurred_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
