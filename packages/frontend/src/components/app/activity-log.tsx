"use client";

import { Download, Eye } from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { formatDwell, formatRelativeTime } from "@/lib/links-analytics";
import type { LinkEvent } from "@/stores/links-store";

export function ActivityLog({ events }: { events: LinkEvent[] }) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
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
            {event.type === "download" ? (
              <Download className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground">
              {event.type === "download" ? "Resume downloaded" : `Page ${event.page} viewed`}
              {event.dwellSeconds !== null ? (
                <span className="text-foreground-muted"> · {formatDwell(event.dwellSeconds)}</span>
              ) : null}
            </p>
            <p className="mt-0.5 truncate text-xs text-foreground-muted">
              {event.device} · {event.browser} on {event.os} ·{" "}
              {event.referrerDomain ?? "direct"}
              {event.utmSource ? ` (utm: ${event.utmSource})` : ""}
            </p>
          </div>

          <span className="shrink-0 text-xs text-foreground-muted">
            {formatRelativeTime(event.occurredAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
