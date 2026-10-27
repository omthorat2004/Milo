"use client";

import { EmptyState } from "@/components/app/empty-state";
import { dailyActivity, formatShortDate } from "@/lib/links-analytics";
import type { AnalyticsEvent } from "@/lib/links.api";

/** No time dimension existed anywhere in the UI before this: every other panel collapses the
 * whole history into one number. This is the one place a trend (growing, flat, dead) is visible. */
export function ActivityTrend({ events, days = 14 }: { events: AnalyticsEvent[]; days?: number }) {
  const daily = dailyActivity(events, days);
  const max = Math.max(1, ...daily.map((day) => day.views));
  const hasActivity = daily.some((day) => day.views > 0 || day.downloads > 0);

  return (
    <section className="mt-8 rounded-card border border-surface-border bg-surface/60 p-5">
      <h2 className="font-mono text-[11px] tracking-[0.18em] text-foreground-muted uppercase">
        Views, last {days} days
      </h2>

      {!hasActivity ? (
        <EmptyState
          title="No activity yet"
          description="Daily views and downloads will chart here once a link gets its first open."
          className="mt-4 border-0 bg-transparent px-0 py-8"
        />
      ) : (
        <>
          <div className="mt-6 flex h-20 items-end gap-1">
            {daily.map((day) => (
              <div
                key={day.date}
                className="group relative flex-1"
                title={`${formatShortDate(day.date)}: ${day.views} view${day.views === 1 ? "" : "s"}, ${day.downloads} download${day.downloads === 1 ? "" : "s"}`}
              >
                <div
                  className="w-full rounded-t bg-signal-400/70 transition-colors group-hover:bg-signal-400"
                  style={{ height: `${Math.max(3, (day.views / max) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-foreground-muted">
            <span>{formatShortDate(daily[0]?.date ?? "")}</span>
            <span>{formatShortDate(daily[daily.length - 1]?.date ?? "")}</span>
          </div>
        </>
      )}
    </section>
  );
}
