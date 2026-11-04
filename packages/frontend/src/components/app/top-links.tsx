"use client";

import Link from "next/link";

import { EmptyState } from "@/components/app/empty-state";
import { LinkStatusBadge } from "@/components/app/link-status-badge";
import { topLinks } from "@/lib/links-analytics";
import { linkStatus, type AnalyticsEvent, type TrackingLink } from "@/lib/links.api";

/** The account dashboard's answer to "which application is actually getting looked at",
 * ranking every link the owner has by view count. Nothing like this existed before: the
 * old dashboard only ever showed one combined total across every link. */
export function TopLinksPanel({
  links,
  events,
}: {
  links: TrackingLink[];
  events: AnalyticsEvent[];
}) {
  const top = topLinks(links, events, linkStatus);
  const max = Math.max(1, ...top.map((link) => link.views));

  return (
    <section className="rounded-card border border-surface-border bg-surface/60 p-5">
      <h2 className="font-mono text-[11px] tracking-[0.18em] text-foreground-muted uppercase">
        Top links
      </h2>

      {top.length === 0 ? (
        <EmptyState
          title="No links yet"
          description="Once you have more than one tracking link, the ones getting the most views show up here first."
          className="mt-4 border-0 bg-transparent px-0 py-8"
        />
      ) : (
        <ul className="mt-4 space-y-3">
          {top.map((link) => (
            <li key={link.linkId} className="flex items-center gap-3">
              <Link
                href={`/${link.slug}/dashboard`}
                className="w-24 shrink-0 truncate text-sm text-foreground hover:text-signal-400 sm:w-40"
              >
                {link.title}
              </Link>
              {/* Decorative relative-to-max bar: the stats text already carries the real
               * numbers, so this is the one dropped at phone width rather than shrunk,
               * matching the table's "hide, don't shrink" column convention. */}
              <div className="hidden h-1.5 flex-1 rounded-full bg-surface sm:block">
                <div
                  className="h-1.5 rounded-full bg-signal-400"
                  style={{ width: `${(link.views / max) * 100}%` }}
                />
              </div>
              <span className="ml-auto shrink-0 text-right text-xs text-foreground-muted sm:ml-0 sm:w-24">
                {link.views} views · {link.downloads} dl
              </span>
              <LinkStatusBadge status={link.status} className="shrink-0" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
