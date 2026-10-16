"use client";

import { ActivityLog } from "@/components/app/activity-log";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { useLinksStore } from "@/stores/links-store";

export function LinkLogs({ linkId }: { linkId: string }) {
  const link = useLinksStore((state) => state.links.find((candidate) => candidate.id === linkId));
  const events = useLinksStore((state) => state.events.filter((event) => event.linkId === linkId));

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
        eyebrow={`Resume · ${link.label}`}
        title="Logs"
        description="The raw events behind this link's dashboard, newest first."
      />

      <ActivityLog events={events} />
    </div>
  );
}
