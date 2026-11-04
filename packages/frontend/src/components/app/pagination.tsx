"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  className?: string;
};

/** Renders nothing for a single-page list: a page X of 1 control is dead
 * chrome, not a feature. */
export function Pagination({ page, pageCount, onChange, className }: Props) {
  if (pageCount <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className={`flex items-center justify-between gap-4 border-t border-surface-border px-5 py-3 ${className ?? ""}`}
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="flex size-8 items-center justify-center rounded-full border border-surface-border bg-surface text-foreground-muted transition-colors hover:border-signal-400/60 hover:text-signal-400 disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>

      <span className="font-mono text-xs text-foreground-muted tabular-nums">
        Page {page} of {pageCount}
      </span>

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
        className="flex size-8 items-center justify-center rounded-full border border-surface-border bg-surface text-foreground-muted transition-colors hover:border-signal-400/60 hover:text-signal-400 disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
