"use client";

import { useState } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { TREND_RANGES, trendPoints, type TrendRange } from "@/lib/links-analytics";
import { cn } from "@/lib/utils";
import type { AnalyticsEvent } from "@/lib/links.api";

/** No time dimension existed anywhere in the UI before this: every other panel collapses the
 * whole history into one number. This is the one place a trend (growing, flat, dead) is visible. */
export function ActivityTrend({ events }: { events: AnalyticsEvent[] }) {
  const [range, setRange] = useState<TrendRange>("14d");
  const points = trendPoints(events, range);
  const max = Math.max(1, ...points.map((point) => point.views));
  const hasActivity = points.some((point) => point.views > 0 || point.downloads > 0);

  // Evenly spaced labels instead of just the two ends, capped so they never crowd into each
  // other regardless of how many points the range has (24 hourly, 30 daily, 12 monthly, ...).
  const maxLabels = 6;
  const labelStep = Math.max(1, Math.ceil(points.length / maxLabels));
  const showLabel = (index: number) =>
    index % labelStep === 0 || index === points.length - 1;

  return (
    <section className="rounded-card border border-surface-border bg-surface/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-mono text-[11px] tracking-[0.18em] text-foreground-muted uppercase">
          Views
        </h2>

        <div className="flex items-center gap-0.5 rounded-full border border-surface-border p-0.5">
          {TREND_RANGES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRange(option.value)}
              aria-pressed={range === option.value}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs transition-colors",
                range === option.value
                  ? "bg-surface text-foreground"
                  : "text-foreground-muted hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {!hasActivity ? (
        <EmptyState
          title="No activity yet"
          description="Views and downloads will chart here once a link gets its first open."
          className="mt-4 border-0 bg-transparent px-0 py-8"
        />
      ) : (
        <>
          <div className="mt-6 flex gap-2">
            <div className="flex h-20 w-8 flex-col justify-between text-right font-mono text-[10px] text-foreground-muted tabular-nums">
              <span>{max}</span>
              <span>{Math.round(max / 2)}</span>
              <span>0</span>
            </div>
            <div className="relative h-20 flex-1 border-l border-surface-border pl-2">
              <div
                className="absolute inset-x-2 top-1/2 border-t border-dashed border-surface-border"
                aria-hidden="true"
              />
              <div className="flex h-full items-end gap-1">
                {points.map((point) => (
                  <div
                    key={point.key}
                    className="group relative h-full flex-1"
                    title={`${point.label}: ${point.views} view${point.views === 1 ? "" : "s"}, ${point.downloads} download${point.downloads === 1 ? "" : "s"}`}
                  >
                    <div
                      className="absolute inset-x-0 bottom-0 rounded-t bg-signal-400/70 transition-colors group-hover:bg-signal-400"
                      style={{ height: `${Math.max(3, (point.views / max) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-2 flex gap-1 pl-12 text-[10px] text-foreground-muted">
            {points.map((point, index) => (
              <span key={point.key} className="flex-1 truncate text-center">
                {showLabel(index) ? point.label : ""}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
