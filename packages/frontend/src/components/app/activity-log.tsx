"use client";

import { Download, Eye } from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { Pagination } from "@/components/app/pagination";
import { usePagination } from "@/hooks/use-pagination";
import {
  capitalize,
  formatDwell,
  formatExactTime,
  formatReferrerLine,
  formatRelativeTime,
} from "@/lib/links-analytics";
import type { AnalyticsEvent } from "@/lib/links.api";

const PAGE_SIZE = 10;

type Props = {
  events: AnalyticsEvent[];
  /** Resolves a resume's title from an event's link_id. Only passed on the
   * account-wide logs page, where events span every resume someone tracks
   * and "Page 1 viewed" alone doesn't say which one; the per-link page is
   * already scoped to a single resume, so it's redundant there. */
  linkTitleFor?: (linkId: string) => string;
};

export function ActivityLog({ events, linkTitleFor }: Props) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  );
  const { page, pageCount, pageItems: pageEvents, setPage } = usePagination(sorted, PAGE_SIZE);

  if (sorted.length === 0) {
    return (
      <EmptyState
        title="No events recorded"
        description="Opens, page views and downloads appear here the moment someone uses one of your links."
        className="mt-10"
      />
    );
  }

  return (
    <div className="mt-10 overflow-hidden rounded-card border border-surface-border">
      <ul>
        {pageEvents.map((event) => (
          <li
            key={event.id}
            className="flex items-center gap-4 border-b border-surface-border bg-surface/40 px-5 py-4 last:border-0"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-foreground-muted">
              {event.event_type === "download" ? (
                <Download className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">
                {event.event_type === "download"
                  ? "Resume downloaded"
                  : event.page_number !== null
                    ? `Page ${event.page_number} viewed`
                    : "Resume viewed"}
                {event.dwell_time_seconds !== null ? (
                  <span className="text-foreground-muted">
                    {" "}
                    · {formatDwell(event.dwell_time_seconds)}
                  </span>
                ) : null}
              </p>
              {linkTitleFor ? (
                <p className="mt-0.5 truncate text-xs text-foreground">
                  {linkTitleFor(event.link_id)}
                </p>
              ) : null}
              <p className="mt-0.5 truncate text-xs text-foreground-muted">
                {event.device_category ? capitalize(event.device_category) : "Unknown device"} ·{" "}
                {event.browser ?? "Unknown browser"} on {event.os ?? "Unknown OS"}
              </p>
              <p className="mt-0.5 truncate text-xs text-foreground-muted">
                {formatReferrerLine(event)}
              </p>
            </div>

            <span
              className="shrink-0 text-xs text-foreground-muted"
              title={formatExactTime(event.occurred_at)}
            >
              {formatRelativeTime(event.occurred_at)}
            </span>
          </li>
        ))}
      </ul>

      <Pagination page={page} pageCount={pageCount} onChange={setPage} />
    </div>
  );
}
