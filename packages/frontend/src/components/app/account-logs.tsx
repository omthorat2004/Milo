"use client";

import { ActivityLog } from "@/components/app/activity-log";
import { useLinksStore } from "@/stores/links-store";

export function AccountLogs() {
  const events = useLinksStore((state) => state.events);

  return <ActivityLog events={events} />;
}
