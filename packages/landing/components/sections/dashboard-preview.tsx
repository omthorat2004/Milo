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

        <div className="mt-14 overflow-hidden rounded-card border border-sand-300/12 bg-ink-900/80">
          <header className="flex items-center justify-between border-b border-sand-300/10 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-clay-400/60" />
              <span className="size-2 rounded-full bg-sand-700/60" />
              <span className="size-2 rounded-full bg-sand-700/60" />
            </div>
            <p className="font-mono text-[11px] tracking-[0.16em] text-sand-700 uppercase">
              Example data
            </p>
          </header>

          <div className="grid gap-px bg-sand-300/8 sm:grid-cols-2 lg:grid-cols-4">
            {summary.map((card) => (
              <div key={card.label} className="bg-ink-900 px-5 py-6">
                <p className="text-xs tracking-wide text-sand-700">{card.label}</p>
                <p className="mt-2 font-display text-4xl text-sand-50">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-px border-t border-sand-300/10 bg-sand-300/8 lg:grid-cols-3">
            <Panel title="Traffic sources">
              <ul className="space-y-3">
                {sources.map((source) => (
                  <li key={source.label} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs text-sand-500">{source.label}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-700">
                      <span
                        className="block h-full rounded-full bg-signal-400/80"
                        style={{ width: `${(source.count / maxSource) * 100}%` }}
                      />
                    </span>
                    <span className="w-5 text-right font-mono text-xs text-sand-300">
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
                    <span className="text-xs text-sand-500">{page.label}</span>
                    <span className="text-xs text-sand-300">
                      {page.viewers} viewers
                      <span className="ml-2 font-mono text-sand-700">{page.time}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-sand-300/10 pt-4 text-xs text-sand-700">
                Average reading time
                <span className="ml-2 font-mono text-sand-100">1m 42s</span>
              </p>
            </Panel>

            <Panel title="Recent activity">
              <ul className="space-y-3">
                {activity.map((item, index) => (
                  <li key={index} className="flex items-baseline gap-3 text-xs">
                    <span className="font-mono text-sand-700">{item.time}</span>
                    <span className="text-sand-300">{item.event}</span>
                    <span className="ml-auto text-sand-700">
                      {item.source} · {item.device}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-sand-300/10 pt-4 text-xs text-sand-700">
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
    <div className={cn("bg-ink-900 px-5 py-6", className)}>
      <h3 className="mb-5 font-mono text-[11px] tracking-[0.18em] text-sand-700 uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}
