"use client";

import { ActivityLog } from "@/components/app/activity-log";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { useLinkEventsQuery, useLinkQuery } from "@/hooks/use-link-queries";

export function LinkLogs({ linkId }: { linkId: string }) {
  const linkQuery = useLinkQuery(linkId);
  const eventsQuery = useLinkEventsQuery(linkId);

  if (linkQuery.isLoading) {
    return (
      <p className="mx-auto w-full max-w-5xl px-5 py-8 text-sm text-foreground-muted">Loading…</p>
    );
  }

  const link = linkQuery.data;

  if (!link) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <PageHeader eyebrow="Not found" title="Logs" />
        <EmptyState
          title="This link doesn't exist"
          description="It may have been deleted. Here's the full list of what's left."
          action={<Button href="/links">Back to links</Button>}
          className="mt-10"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow={`Resume · ${link.resume_title}`}
        title="Logs"
        description="The raw events behind this link's dashboard, newest first."
      />

      <ActivityLog events={eventsQuery.data ?? []} />
    </div>
  );
}
