"use client";

import { useState } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { Pagination } from "@/components/app/pagination";
import { usePagination } from "@/hooks/use-pagination";
import {
  capitalize,
  formatDwell,
  formatRelativeTime,
  pageNumbers,
  readingTime,
  visitRows,
} from "@/lib/links-analytics";
import type { AnalyticsEvent } from "@/lib/links.api";

const PAGE_SIZE = 8;
const ALL_PAGES = "all";

/**
 * Time spent reading, for the whole resume or for one page picked from the dropdown. The
 * metrics and the visit list below both follow the picker. Visits are anonymous: each row
 * shows only device, browser, OS and referrer.
 */
export function ReadingTime({ events }: { events: AnalyticsEvent[] }) {
  const [selected, setSelected] = useState(ALL_PAGES);
  const pages = pageNumbers(events);
  const page = selected === ALL_PAGES ? null : Number(selected);

  const metrics = readingTime(events, page);
  const rows = visitRows(events, page);
  const { page: listPage, pageCount, pageItems, setPage } = usePagination(rows, PAGE_SIZE);

  const scope = page === null ? "the resume" : `page ${page}`;
  const cards = [
    { label: page === null ? "Visits" : `Visits to page ${page}`, value: String(rows.length) },
    {
      label: `Avg time on ${scope}`,
      value: metrics.avgSeconds === null ? "N/A" : formatDwell(metrics.avgSeconds),
    },
    {
      label: `Total time on ${scope}`,
      value: metrics.avgSeconds === null ? "N/A" : formatDwell(metrics.totalSeconds),
    },
  ];

  return (
    <section className="rounded-card border border-surface-border bg-surface/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-mono text-[11px] tracking-[0.18em] text-foreground-muted uppercase">
          Reading time
        </h2>
        <label className="flex items-center gap-2 text-xs text-foreground-muted">
          Show
          <select
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              setPage(1);
            }}
            className="rounded-full border border-surface-border bg-surface px-3 py-1.5 text-xs text-foreground"
          >
            <option value={ALL_PAGES}>Whole resume</option>
            {pages.map((number) => (
              <option key={number} value={String(number)}>
                Page {number}
              </option>
            ))}
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No reading time yet"
          description="Time per page is recorded when a viewer closes the resume, so it shows up after their visit ends."
          className="border-0 bg-transparent px-0 py-8"
        />
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-card border border-surface-border bg-surface-border sm:grid-cols-3">
            {cards.map((card) => (
              <div key={card.label} className="bg-surface px-5 py-5">
                <dt className="text-xs tracking-wide text-foreground-muted">{card.label}</dt>
                <dd className="mt-2 font-display text-3xl text-foreground">{card.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 overflow-hidden rounded-card border border-surface-border">
            <ul>
              {pageItems.map((row) => (
                <li
                  key={row.key}
                  className="flex items-center justify-between gap-4 border-b border-surface-border bg-surface/40 px-5 py-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                      {row.deviceCategory ? capitalize(row.deviceCategory) : "Unknown device"} ·{" "}
                      {row.browser ?? "Unknown browser"} on {row.os ?? "Unknown OS"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-foreground-muted">
                      {row.referrerDomain ?? "Direct"} · {formatRelativeTime(row.startedAt)} ·{" "}
                      {row.pagesRead} {row.pagesRead === 1 ? "page" : "pages"} opened
                    </p>
                    {page === null && row.perPage.length > 1 ? (
                      <p className="mt-0.5 truncate text-xs text-foreground-muted">
                        {row.perPage
                          .map(
                            (entry) =>
                              `p${entry.page} ${entry.seconds === null ? "no data" : formatDwell(entry.seconds)}`,
                          )
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-sm text-foreground tabular-nums">
                    {row.seconds === null ? "no time data" : formatDwell(row.seconds)}
                  </span>
                </li>
              ))}
            </ul>
            <Pagination page={listPage} pageCount={pageCount} onChange={setPage} />
          </div>
        </>
      )}
    </section>
  );
}
