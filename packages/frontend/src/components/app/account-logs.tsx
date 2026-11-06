"use client";

import { ActivityLog } from "@/components/app/activity-log";
import { useMyEventsQuery, useMyLinksQuery } from "@/hooks/use-link-queries";

export function AccountLogs() {
  const eventsQuery = useMyEventsQuery();
  const linksQuery = useMyLinksQuery();

  const links = linksQuery.data ?? [];

  function linkTitleFor(linkId: string): string {
    return links.find((link) => link.id === linkId)?.resume_title ?? "Deleted link";
  }

  return (
    <ActivityLog
      events={eventsQuery.data ?? []}
      linkTitleFor={linkTitleFor}
      loading={eventsQuery.isPending || linksQuery.isPending}
    />
  );
}
