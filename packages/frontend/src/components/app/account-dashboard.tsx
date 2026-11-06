"use client";

import Link from "next/link";

import { ActivityTrend } from "@/components/app/activity-trend";
import { AnalyticsPanels } from "@/components/app/analytics-panels";
import { EmptyState } from "@/components/app/empty-state";
import { TopLinksPanel } from "@/components/app/top-links";
import { SummaryCards } from "@/components/app/summary-cards";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyEventsQuery, useMyLinksQuery } from "@/hooks/use-link-queries";
import { formatRelativeTime } from "@/lib/links-analytics";

export function AccountDashboard() {
  const linksQuery = useMyLinksQuery();
  const eventsQuery = useMyEventsQuery();

  const loading = eventsQuery.isPending || linksQuery.isPending;
  const links = linksQuery.data ?? [];
  const events = eventsQuery.data ?? [];

  const recent = [...events]
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    .slice(0, 6);

  function linkTitle(linkId: string): string {
    return links.find((link) => link.id === linkId)?.resume_title ?? "Deleted link";
  }

  // Falls back to the Mongo id itself for an event whose link was deleted: that 404s the
  // same way the old link.id-based href always did for a gone link, not a new failure mode.
  function linkSlug(linkId: string): string {
    return links.find((link) => link.id === linkId)?.slug ?? linkId;
  }

  return (
    <>
      <SummaryCards events={events} loading={loading} />

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <ActivityTrend events={events} />

          <TopLinksPanel links={links} events={events} />

          <AnalyticsPanels events={events} />

          <section>
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
                        {event.event_type === "download"
                          ? "Download"
                          : event.event_type === "page_view"
                            ? `Page ${event.page_number ?? ""} view`
                            : "View"}{" "}
                        ·{" "}
                        <Link
                          href={`/${linkSlug(event.link_id)}/dashboard`}
                          className="hover:text-signal-400"
                        >
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
      )}
    </>
  );
}
