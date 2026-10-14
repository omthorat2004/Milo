import { Container, Section, SectionHeading } from "@/components/ui/section";
import { cn } from "@/lib/utils";

/**
 * Illustrative preview of the dashboard.
 *
 * Every number here is hand-written sample content for the marketing page and
 * is labelled as such on screen. No analytics code, real or mocked, runs on
 * this site.
 */
const summary = [
  { label: "Resume views", value: "12" },
  { label: "Unique viewers", value: "8" },
  { label: "Downloads", value: "3" },
  { label: "Download rate", value: "38%" },
] as const;

const sources = [
  { label: "LinkedIn", count: 5 },
  { label: "GitHub", count: 2 },
  { label: "Portfolio", count: 2 },
  { label: "Email", count: 1 },
  { label: "Direct", count: 2 },
] as const;

const pages = [
  { label: "Page 1", viewers: 12, time: "0m 48s" },
  { label: "Page 2", viewers: 10, time: "1m 31s" },
  { label: "Page 3", viewers: 7, time: "0m 22s" },
] as const;

const activity = [
  { time: "10:42", event: "Resume viewed", source: "LinkedIn", device: "Desktop" },
  { time: "10:35", event: "Resume viewed", source: "Direct", device: "Mobile" },
  { time: "10:21", event: "Resume downloaded", source: "LinkedIn", device: "Desktop" },
] as const;

const maxSource = Math.max(...sources.map((source) => source.count));

export function DashboardPreview() {
  return (
    <Section id="analytics">
      <Container>
        <SectionHeading
          eyebrow="The dashboard"
          title="Everything you get. Nothing you shouldn't."
          description="Performance, sources, and per-page attention. No IP, no city, no company name, no identity, because Milo never collects them."
        />

        <div className="mt-14 overflow-hidden rounded-card border border-surface-border bg-surface/80">
          <header className="flex items-center justify-between border-b border-surface-border px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-clay-400/60" />
              <span className="size-2 rounded-full bg-foreground-muted/40" />
              <span className="size-2 rounded-full bg-foreground-muted/40" />
            </div>
            <p className="font-mono text-[11px] tracking-[0.16em] text-foreground-muted uppercase">
              Example data
            </p>
          </header>

          <div className="grid gap-px bg-surface-border sm:grid-cols-2 lg:grid-cols-4">
            {summary.map((card) => (
              <div key={card.label} className="bg-surface px-5 py-6">
                <p className="text-xs tracking-wide text-foreground-muted">{card.label}</p>
                <p className="mt-2 font-display text-4xl text-foreground">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-px border-t border-surface-border bg-surface-border lg:grid-cols-3">
            <Panel title="Traffic sources">
              <ul className="space-y-3">
                {sources.map((source) => (
                  <li key={source.label} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs text-foreground-muted">
                      {source.label}
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-hover">
                      <span
                        className="block h-full rounded-full bg-signal-400/80"
                        style={{ width: `${(source.count / maxSource) * 100}%` }}
                      />
                    </span>
                    <span className="w-5 text-right font-mono text-xs text-foreground-muted">
                      {source.count}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Page engagement">
              <ul className="space-y-4">
                {pages.map((page) => (
                  <li key={page.label} className="flex items-baseline justify-between gap-3">
                    <span className="text-xs text-foreground-muted">{page.label}</span>
                    <span className="text-xs text-foreground-muted">
                      {page.viewers} viewers
                      <span className="ml-2 font-mono text-foreground-muted">{page.time}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-surface-border pt-4 text-xs text-foreground-muted">
                Average reading time
                <span className="ml-2 font-mono text-foreground">1m 42s</span>
              </p>
            </Panel>

            <Panel title="Recent activity">
              <ul className="space-y-3">
                {activity.map((item, index) => (
                  <li key={index} className="flex items-baseline gap-3 text-xs">
                    <span className="font-mono text-foreground-muted">{item.time}</span>
                    <span className="text-foreground-muted">{item.event}</span>
                    <span className="ml-auto text-foreground-muted">
                      {item.source} · {item.device}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-surface-border pt-4 text-xs text-foreground-muted">
                No name, no company, no location. By design.
              </p>
            </Panel>
          </div>
        </div>
      </Container>
    </Section>
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
    <div className={cn("bg-surface px-5 py-6", className)}>
      <h3 className="mb-5 font-mono text-[11px] tracking-[0.18em] text-foreground-muted uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}
