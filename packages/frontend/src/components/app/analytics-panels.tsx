"use client";

import { EmptyState } from "@/components/app/empty-state";
import { pageEngagement, trafficSources } from "@/lib/links-analytics";
import type { LinkEvent } from "@/stores/links-store";

export function AnalyticsPanels({ events }: { events: LinkEvent[] }) {
  const sources = trafficSources(events);
  const pages = pageEngagement(events);

  return (
    <section className="mt-8 grid gap-4 lg:grid-cols-3">
      <Panel title="Traffic sources" className="lg:col-span-2">
        {sources.length === 0 ? (
          <EmptyState
            title="Nothing to attribute yet"
            description="Once a tracking link is opened, this shows where the traffic came from: LinkedIn, a portfolio, an email, or direct."
            className="border-0 bg-transparent px-0 py-8"
          />
        ) : (
          <ul className="mt-4 space-y-3">
            {sources.map((source) => {
              const max = sources[0]?.count ?? 1;
              return (
                <li key={source.domain} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-sm text-foreground">
                    {source.domain}
                  </span>
                  <div className="h-1.5 flex-1 rounded-full bg-surface">
                    <div
                      className="h-1.5 rounded-full bg-signal-400"
                      style={{ width: `${(source.count / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm text-foreground-muted">
                    {source.count}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Page engagement">
        {pages.length === 0 ? (
          <EmptyState
            title="No pages read yet"
            description="Per-page attention appears here after the first view."
            className="border-0 bg-transparent px-0 py-8"
          />
        ) : (
          <ul className="mt-4 space-y-3">
            {pages.map((page) => (
              <li key={page.page} className="flex items-center justify-between text-sm">
                <span className="text-foreground">Page {page.page}</span>
                <span className="text-foreground-muted">
                  {page.views} views · {page.avgDwellSeconds}s avg
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </section>
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
    <div className={`rounded-card border border-surface-border bg-surface/60 p-5 ${className ?? ""}`}>
      <h2 className="font-mono text-[11px] tracking-[0.18em] text-foreground-muted uppercase">
        {title}
      </h2>
      {children}
    </div>
  );
}
