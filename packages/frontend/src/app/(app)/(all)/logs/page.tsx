import type { Metadata } from "next";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";

export const metadata: Metadata = { title: "Logs" };

const recorded = [
  "Timestamp of the event",
  "An anonymous session id, scoped to one resume",
  "Device category, browser and operating system",
  "Referrer domain and any UTM parameters on your link",
  "Which page was on screen, and roughly how long for",
] as const;

export default function LogsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Event log"
        title="Logs"
        description="The raw events behind the dashboard, newest first. Everything Milo knows about a view is on this page: if it is not here, it was never collected."
      />

      <EmptyState
        title="No events recorded"
        description="Opens, page views and downloads appear here the moment someone uses one of your links."
        className="mt-10"
      />

      <section className="mt-8 rounded-card border border-surface-border bg-surface/50 p-6">
        <h2 className="font-display text-lg text-foreground">What an event contains</h2>
        <ul className="mt-4 space-y-2">
          {recorded.map((item) => (
            <li key={item} className="text-sm text-foreground-muted">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-5 border-t border-surface-border pt-4 text-sm text-foreground-muted">
          No IP address, no location, no name, no company. There is no field for them.
        </p>
      </section>
    </div>
  );
}
