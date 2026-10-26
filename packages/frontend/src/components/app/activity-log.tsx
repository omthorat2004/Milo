"use client";

import { Download, Eye } from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { formatDwell, formatRelativeTime } from "@/lib/links-analytics";
import type { AnalyticsEvent } from "@/lib/links.api";

export function ActivityLog({ events }: { events: AnalyticsEvent[] }) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  );

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
    <ul className="mt-10 overflow-hidden rounded-card border border-surface-border">
      {sorted.map((event) => (
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
                : `Page ${event.page_number ?? "?"} viewed`}
              {event.dwell_time_seconds !== null ? (
                <span className="text-foreground-muted">
                  {" "}
                  · {formatDwell(event.dwell_time_seconds)}
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 truncate text-xs text-foreground-muted">
              {event.device_category ?? "unknown device"} · {event.browser ?? "unknown browser"} on{" "}
              {event.os ?? "unknown OS"} · {event.referrer_domain ?? "direct"}
              {event.utm_source ? ` (utm: ${event.utm_source})` : ""}
            </p>
          </div>

          <span className="shrink-0 text-xs text-foreground-muted">
            {formatRelativeTime(event.occurred_at)}
          </span>
        </li>
      ))}
    </ul>
  );
}
