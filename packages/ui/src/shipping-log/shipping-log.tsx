import { cn } from "../utils";
import {
  formatDate,
  groupByDay,
  summarise,
  whenLabel,
  type PlannedEntry,
  type PlannedWhen,
  type ShipEntry,
} from "./data";

type Props = {
  entries: readonly ShipEntry[];
  /**
   * `full` is the dedicated /path page: stats header and every entry.
   * `compact` is an embed, for a landing-page section that links onward.
   */
  variant?: "full" | "compact";
  /** Caps how many entries render. Useful for the compact embed. */
  limit?: number;
  className?: string;
};

/**
 * Public build log: what shipped, on which day.
 *
 * Presentational only. It derives every number from the entries it is given, so
 * there is no count to forget to update, and both apps render an identical
 * timeline from the same data.
 */
export function ShippingLog({ entries, variant = "full", limit, className }: Props) {
  const visible = typeof limit === "number" ? entries.slice(0, limit) : entries;
  const days = groupByDay(visible);
  const stats = summarise(entries);

  return (
    <div className={className}>
      {variant === "full" ? (
        <dl className="mb-16 grid gap-px overflow-hidden rounded-card border border-sand-300/12 bg-sand-300/10 sm:grid-cols-3">
          <Stat label="Things shipped" value={stats.total} />
          <Stat label="Days with a release" value={stats.shippingDays} />
          <Stat label="Days since the first" value={stats.elapsedDays} />
        </dl>
      ) : null}

      <ol className={cn("space-y-12", variant === "compact" && "space-y-8")}>
        {days.map((day) => (
          <li key={day.date}>
            <div className="flex items-baseline gap-4">
              <h3
                className={cn(
                  "font-display text-sand-50",
                  variant === "full" ? "text-2xl" : "text-lg",
                )}
              >
                {formatDate(day.date)}
              </h3>
              <span className="h-px flex-1 bg-sand-300/12" aria-hidden="true" />
              <span className="font-mono text-xs text-sand-700">
                {day.entries.length} {day.entries.length === 1 ? "release" : "releases"}
              </span>
            </div>

            <ul className="mt-5 space-y-4">
              {day.entries.map((entry) => (
                <li
                  key={entry.title}
                  className="rounded-card border border-sand-300/12 bg-ink-850/70 p-6"
                >
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.14em] uppercase",
                      entry.status === "shipped" ? "text-signal-300" : "text-clay-400",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        entry.status === "shipped" ? "bg-signal-400" : "bg-clay-400",
                      )}
                      aria-hidden="true"
                    />
                    {entry.status === "shipped" ? "Shipped" : "Building"}
                  </span>

                  <h4 className="mt-3 font-display text-xl text-sand-50">{entry.title}</h4>
                  <p className="mt-2.5 text-sm leading-relaxed text-sand-500">
                    {entry.description}
                  </p>

                  <ul className="mt-4 flex flex-wrap gap-2">
                    {entry.tags.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-full border border-sand-300/12 px-2.5 py-1 text-[11px] text-sand-500"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-ink-900 px-5 py-6">
      <dt className="text-xs tracking-wide text-sand-700">{label}</dt>
      <dd className="mt-2 font-display text-4xl text-sand-50">{value}</dd>
    </div>
  );
}

const whenStyles: Record<PlannedWhen, string> = {
  next: "border-signal-400/30 bg-signal-900/25 text-signal-300",
  soon: "border-sand-300/20 bg-ink-850/70 text-sand-300",
  later: "border-sand-300/12 bg-ink-850/40 text-sand-500",
};

/**
 * What is planned, with no dates attached.
 *
 * Sits above the shipped timeline so the page answers both questions a reader
 * has: what exists, and what is being worked on. Buckets rather than dates,
 * because a missed date on this page would undo the credibility the dated
 * entries below it are there to build.
 */
export function UpcomingWork({
  entries,
  className,
}: {
  entries: readonly PlannedEntry[];
  className?: string;
}) {
  return (
    <section className={className} aria-labelledby="upcoming-heading">
      <div className="flex items-baseline gap-4">
        <h3 id="upcoming-heading" className="font-display text-2xl text-sand-50">
          Not shipped yet
        </h3>
        <span className="h-px flex-1 bg-sand-300/12" aria-hidden="true" />
        <span className="font-mono text-xs text-sand-700">no dates promised</span>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {entries.map((entry) => (
          <li
            key={entry.title}
            className="rounded-card border border-dashed border-sand-300/18 bg-ink-850/40 p-6"
          >
            <span
              className={cn(
                "inline-flex rounded-full border px-2.5 py-1 font-mono text-[11px] tracking-[0.14em] uppercase",
                whenStyles[entry.when],
              )}
            >
              {whenLabel[entry.when]}
            </span>

            <h4 className="mt-3 font-display text-lg text-sand-50">{entry.title}</h4>
            <p className="mt-2 text-sm leading-relaxed text-sand-500">{entry.description}</p>

            <ul className="mt-4 flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-sand-300/12 px-2.5 py-1 text-[11px] text-sand-500"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
