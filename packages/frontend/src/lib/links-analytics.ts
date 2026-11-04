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

export function capitalize(value: string): string {
  return value.length > 0 ? value[0]!.toUpperCase() + value.slice(1) : value;
}

/** Device/browser/OS are allowed signals (root CLAUDE.md) the backend already records on every
 * event; these three were captured from the start but never surfaced in any panel.
 * device_category arrives lowercase ("desktop"/"mobile"/"tablet") from detectDeviceCategory,
 * unlike browser/os which already come out properly cased; capitalized here for display only. */
export function deviceBreakdown(events: AnalyticsEvent[]): NamedCount[] {
  return groupCount(events, (event) => capitalize(event.device_category ?? "Unknown"));
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

/** `isoDate` is a UTC calendar date (a `dailyActivity` bucket key), so this
 * must format in UTC too, formatting in the viewer's local zone would read
 * UTC midnight as the previous day for any negative UTC offset, shifting
 * every label back by one. */
export function formatShortDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export type HourlyActivity = { hour: string; views: number; downloads: number };

/** Buckets today's events (UTC calendar day) by UTC hour, 24 buckets. The
 * other ranges are coarse enough that a day bucket reads fine, but "today"
 * collapsed to a single bucket would just be one bar, not a trend. */
export function hourlyActivity(events: AnalyticsEvent[]): HourlyActivity[] {
  const todayKey = new Date().toISOString().slice(0, 10);
  const buckets = new Map<string, HourlyActivity>();

  for (let hour = 0; hour < 24; hour++) {
    const key = `${todayKey}T${String(hour).padStart(2, "0")}`;
    buckets.set(key, { hour: key, views: 0, downloads: 0 });
  }

  for (const event of events) {
    if (!event.occurred_at.startsWith(todayKey)) continue;
    const key = event.occurred_at.slice(0, 13);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (event.event_type === "download") bucket.downloads += 1;
    else bucket.views += 1;
  }

  return Array.from(buckets.values());
}

export function formatHourLabel(hourKey: string): string {
  return new Date(`${hourKey}:00:00Z`).toLocaleTimeString(undefined, {
    hour: "numeric",
    timeZone: "UTC",
  });
}

export type MonthlyActivity = { month: string; views: number; downloads: number };

/** Buckets by UTC calendar month, 12 buckets, for the "1 year" range: 365
 * individual day-bars would be unreadable at chart width. */
export function monthlyActivity(events: AnalyticsEvent[], months = 12): MonthlyActivity[] {
  const buckets = new Map<string, MonthlyActivity>();
  const today = new Date();

  for (let offset = months - 1; offset >= 0; offset--) {
    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - offset, 1));
    const key = monthStart.toISOString().slice(0, 7);
    buckets.set(key, { month: key, views: 0, downloads: 0 });
  }

  for (const event of events) {
    const key = event.occurred_at.slice(0, 7);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (event.event_type === "download") bucket.downloads += 1;
    else bucket.views += 1;
  }

  return Array.from(buckets.values());
}

export function formatMonthLabel(monthKey: string): string {
  return new Date(`${monthKey}-01T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

export type TrendRange = "today" | "7d" | "14d" | "1m" | "1y";

export type TrendPoint = { key: string; label: string; views: number; downloads: number };

export const TREND_RANGES: { value: TrendRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7D" },
  { value: "14d", label: "14D" },
  { value: "1m", label: "1M" },
  { value: "1y", label: "1Y" },
];

/** The one entry point `ActivityTrend` calls: picks the right bucket size
 * (hour/day/month) for the selected range and normalizes it to a common
 * shape, so the chart itself doesn't need to know which granularity it's
 * drawing. */
export function trendPoints(events: AnalyticsEvent[], range: TrendRange): TrendPoint[] {
  switch (range) {
    case "today":
      return hourlyActivity(events).map((point) => ({
        key: point.hour,
        label: formatHourLabel(point.hour),
        views: point.views,
        downloads: point.downloads,
      }));
    case "1y":
      return monthlyActivity(events).map((point) => ({
        key: point.month,
        label: formatMonthLabel(point.month),
        views: point.views,
        downloads: point.downloads,
      }));
    case "7d":
    case "14d":
    case "1m": {
      const days = { "7d": 7, "14d": 14, "1m": 30 }[range];
      return dailyActivity(events, days).map((point) => ({
        key: point.date,
        label: formatShortDate(point.date),
        views: point.views,
        downloads: point.downloads,
      }));
    }
  }
}

export type TopLink = {
  linkId: string;
  slug: string;
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
        slug: link.slug,
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

/** The exact moment, for a hover title next to the relative time: the Logs
 * page promises "everything Milo knows about a view is on this page," and
 * a relative label like "2h ago" alone can't answer "when, exactly." */
export function formatExactTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

/** Every referrer/campaign signal an event carries, joined into one line.
 * utm_medium and utm_campaign were captured but never shown anywhere in the
 * UI before this, "all the information" the Logs page promises means every
 * allowed signal is actually visible, not just source. */
export function formatReferrerLine(event: AnalyticsEvent): string {
  const parts = [event.referrer_domain ?? "direct"];
  if (event.utm_source) parts.push(`utm_source=${event.utm_source}`);
  if (event.utm_medium) parts.push(`utm_medium=${event.utm_medium}`);
  if (event.utm_campaign) parts.push(`utm_campaign=${event.utm_campaign}`);
  return parts.join(" · ");
}
