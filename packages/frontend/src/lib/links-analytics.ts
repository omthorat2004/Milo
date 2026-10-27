import type { AnalyticsEvent, TrackingLink } from "@/lib/links.api";

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

export type NamedCount = { name: string; count: number };

function groupCount(
  events: AnalyticsEvent[],
  key: (event: AnalyticsEvent) => string,
): NamedCount[] {
  const counts = new Map<string, number>();

  for (const event of events) {
    const name = key(event);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/** Device/browser/OS are allowed signals (root CLAUDE.md) the backend already records on every
 * event; these three were captured from the start but never surfaced in any panel. */
export function deviceBreakdown(events: AnalyticsEvent[]): NamedCount[] {
  return groupCount(events, (event) => event.device_category ?? "Unknown");
}

export function browserBreakdown(events: AnalyticsEvent[]): NamedCount[] {
  return groupCount(events, (event) => event.browser ?? "Unknown");
}

export function osBreakdown(events: AnalyticsEvent[]): NamedCount[] {
  return groupCount(events, (event) => event.os ?? "Unknown");
}

export type DailyActivity = { date: string; views: number; downloads: number };

/** Buckets by the UTC calendar date of `occurred_at`. A viewer near a day boundary in a
 * non-UTC timezone can land in the adjacent bucket; close enough for a trend chart. */
export function dailyActivity(events: AnalyticsEvent[], days = 14): DailyActivity[] {
  const buckets = new Map<string, DailyActivity>();
  const today = new Date();

  for (let offset = days - 1; offset >= 0; offset--) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() - offset);
    const key = day.toISOString().slice(0, 10);
    buckets.set(key, { date: key, views: 0, downloads: 0 });
  }

  for (const event of events) {
    const key = event.occurred_at.slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (event.event_type === "download") bucket.downloads += 1;
    else bucket.views += 1;
  }

  return Array.from(buckets.values());
}

export function formatShortDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export type TopLink = {
  linkId: string;
  title: string;
  status: "active" | "expired" | "revoked";
  views: number;
  downloads: number;
};

/** Ranks every link the owner has by view count, across all of their resumes, the
 * account-dashboard's answer to "which of my applications is actually getting looked at." */
export function topLinks(
  links: readonly TrackingLink[],
  events: AnalyticsEvent[],
  statusOf: (link: TrackingLink) => "active" | "expired" | "revoked",
  limit = 5,
): TopLink[] {
  const countsByLink = new Map<string, { views: number; downloads: number }>();

  for (const event of events) {
    const entry = countsByLink.get(event.link_id) ?? { views: 0, downloads: 0 };
    if (event.event_type === "download") entry.downloads += 1;
    else entry.views += 1;
    countsByLink.set(event.link_id, entry);
  }

  return links
    .map((link) => {
      const counts = countsByLink.get(link.id) ?? { views: 0, downloads: 0 };
      return {
        linkId: link.id,
        title: link.resume_title,
        status: statusOf(link),
        views: counts.views,
        downloads: counts.downloads,
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
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
