"use client";

import { ActivityLog } from "@/components/app/activity-log";
import { useMyEventsQuery } from "@/hooks/use-link-queries";

export function AccountLogs() {
  const eventsQuery = useMyEventsQuery();

  return <ActivityLog events={eventsQuery.data ?? []} />;
}
