import type { AnalyticsEvent } from "@/lib/links.api";

export type Summary = {
  views: number;
  uniqueViewers: number;
  downloads: number;
  downloadRate: number | null;
};

export function computeSummary(events: AnalyticsEvent[]): Summary {
  const views = events.filter((event) => event.event_type === "view");
  const downloads = events.filter((event) => event.event_type === "download");
  const uniqueViewers = new Set(
    views.map((event) => event.session_id).filter((id): id is string => id !== null),
  ).size;

  return {
    views: views.length,
    uniqueViewers,
    downloads: downloads.length,
    downloadRate: uniqueViewers > 0 ? downloads.length / uniqueViewers : null,
  };
}

export type TrafficSource = { domain: string; count: number };

export function trafficSources(events: AnalyticsEvent[], limit = 5): TrafficSource[] {
  const counts = new Map<string, number>();

  for (const event of events) {
    const domain = event.referrer_domain ?? "Direct";
    counts.set(domain, (counts.get(domain) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export type PageEngagement = { page: number; views: number; avgDwellSeconds: number };

export function pageEngagement(events: AnalyticsEvent[]): PageEngagement[] {
  const byPage = new Map<number, { views: number; dwellTotal: number; dwellCount: number }>();

  for (const event of events) {
    if (event.event_type !== "view" || event.page_number === null) continue;
    const entry = byPage.get(event.page_number) ?? { views: 0, dwellTotal: 0, dwellCount: 0 };
    entry.views += 1;
    if (event.dwell_time_seconds !== null) {
      entry.dwellTotal += event.dwell_time_seconds;
      entry.dwellCount += 1;
    }
    byPage.set(event.page_number, entry);
  }

  return Array.from(byPage.entries())
    .map(([page, entry]) => ({
      page,
      views: entry.views,
      avgDwellSeconds: entry.dwellCount > 0 ? Math.round(entry.dwellTotal / entry.dwellCount) : 0,
    }))
    .sort((a, b) => a.page - b.page);
}

export function formatDwell(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / (60 * 1000));

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
