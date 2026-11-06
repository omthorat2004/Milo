"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { computeSummary, formatDwell } from "@/lib/links-analytics";
import type { AnalyticsEvent } from "@/lib/links.api";

/** The headline numbers, shared by the account dashboard and a single link's dashboard. */
export function SummaryCards({ events, loading }: { events: AnalyticsEvent[]; loading: boolean }) {
  const summary = computeSummary(events);

  const cards = [
    { label: "Resume views", value: String(summary.views) },
    { label: "Unique viewers", value: String(summary.uniqueViewers) },
    { label: "Downloads", value: String(summary.downloads) },
    {
      label: "Download rate",
      value: summary.downloadRate === null ? "N/A" : `${Math.round(summary.downloadRate * 100)}%`,
    },
    {
      label: "Avg time per visit",
      value: summary.avgTimeSeconds === null ? "N/A" : formatDwell(summary.avgTimeSeconds),
    },
    {
      label: "Total time read",
      value: summary.avgTimeSeconds === null ? "N/A" : formatDwell(summary.totalTimeSeconds),
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-surface-border bg-surface-border lg:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className="bg-surface px-5 py-6">
          <dt className="text-xs tracking-wide text-foreground-muted">{card.label}</dt>
          <dd className="mt-2 font-display text-4xl text-foreground">
            {loading ? <Skeleton className="h-10 w-16" /> : card.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
