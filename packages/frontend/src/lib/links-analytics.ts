import type { AnalyticsEvent, TrackingLink } from "@/lib/links.api";

export type Summary = {
  views: number;
  uniqueViewers: number;
  downloads: number;
  downloadRate: number | null;
};

export type VisitTime = { seconds: number; pages: number };

/** Seconds each visit spent, summed over the pages it reported time for. A visit is every
 * event sharing a visit_id; an old event with none counts as a visit of its own. With `page`,
 * only that page's time counts. Visits that reported no time are left out. */
export function visitTimes(
  events: AnalyticsEvent[],
  page: number | null = null,
): Map<string, VisitTime> {
  const totals = new Map<string, VisitTime>();

  for (const event of events) {
    if (event.event_type === "download" || event.dwell_time_seconds === null) continue;
    if (page !== null && event.page_number !== page) continue;
    const key = event.visit_id ?? `event:${event.id}`;
    const entry = totals.get(key) ?? { seconds: 0, pages: 0 };
    totals.set(key, {
      seconds: entry.seconds + event.dwell_time_seconds,
      pages: entry.pages + 1,
    });
  }

  return totals;
}

export type ReadingTime = {
  /** Visits that reported time (on the chosen page, if one is chosen). */
  visits: number;
  /** Mean time per such visit. Null when none reported any, so the UI shows "N/A", not 0s. */
  avgSeconds: number | null;
  totalSeconds: number;
};

/** Total and average reading time over the whole resume (`page` null) or one page of it. */
export function readingTime(events: AnalyticsEvent[], page: number | null = null): ReadingTime {
  const seconds = Array.from(visitTimes(events, page).values(), (visit) => visit.seconds);
  const total = seconds.reduce((sum, value) => sum + value, 0);

  return {
    visits: seconds.length,
    avgSeconds: seconds.length > 0 ? Math.round(total / seconds.length) : null,
    totalSeconds: Math.round(total),
  };
}

/** Every page number that has an event, ascending, for the page picker. */
export function pageNumbers(events: AnalyticsEvent[]): number[] {
  const pages = new Set<number>();
  for (const event of events) {
    if (event.event_type !== "download" && event.page_number !== null) pages.add(event.page_number);
  }
  return Array.from(pages).sort((a, b) => a - b);
}

export type VisitRow = {
  key: string;
  startedAt: string;
  deviceCategory: string | null;
  browser: string | null;
  os: string | null;
  referrerDomain: string | null;
  /** Time on the chosen page, or on the whole resume when none is chosen. Null = no time data. */
  seconds: number | null;
  /** How many different pages this visit opened. */
  pagesRead: number;
  perPage: { page: number; seconds: number | null }[];
};

/** One row per visit, newest first. With `page`, only visits that opened that page. Visits
 * carry only the allowed anonymous signals (device, browser, OS, referrer), never an identity. */
export function visitRows(events: AnalyticsEvent[], page: number | null = null): VisitRow[] {
  const groups = new Map<string, AnalyticsEvent[]>();

  for (const event of events) {
    if (event.event_type === "download" || event.page_number === null) continue;
    const key = event.visit_id ?? `event:${event.id}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  const rows: VisitRow[] = [];
  for (const [key, group] of groups) {
    const ordered = [...group].sort(
      (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
    );
    const perPage = ordered
      .map((event) => ({ page: event.page_number ?? 1, seconds: event.dwell_time_seconds }))
      .sort((a, b) => a.page - b.page);

    let seconds: number | null;
    if (page === null) {
      const timed = perPage.filter((entry) => entry.seconds !== null);
      seconds =
        timed.length > 0 ? timed.reduce((sum, entry) => sum + (entry.seconds ?? 0), 0) : null;
    } else {
      const onPage = perPage.find((entry) => entry.page === page);
      if (!onPage) continue;
      seconds = onPage.seconds;
    }

    const first = ordered[0]!;
    rows.push({
      key,
      startedAt: first.occurred_at,
      deviceCategory: first.device_category,
      browser: first.browser,
      os: first.os,
      referrerDomain: first.referrer_domain,
      seconds,
      pagesRead: new Set(perPage.map((entry) => entry.page)).size,
      perPage,
    });
  }

  return rows.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

export function computeSummary(events: AnalyticsEvent[]): Summary {
  const views = events.filter((event) => event.event_type === "view");
  const downloads = events.filter((event) => event.event_type === "download");
  const uniqueViewers = new Set(
    views.map((event) => event.session_id).filter((id): id is string => id !== null),
  ).size;
  const uniqueDownloaders = new Set(
    downloads.map((event) => event.session_id).filter((id): id is string => id !== null),
  ).size;

  return {
    views: views.length,
    uniqueViewers,
    downloads: downloads.length,
    // Share of viewers who downloaded, not downloads per viewer: one person
    // downloading twice must not push this past 100%.
    downloadRate: uniqueViewers > 0 ? Math.min(1, uniqueDownloaders / uniqueViewers) : null,
  };
}

/** View events only, one per session (the first seen). The source/device/browser/OS panels
 * use this so one visit that also downloaded the PDF counts once, matching "Unique viewers"
 * instead of counting the download event as a second visitor. An event with no session id
 * can't be matched to any other, so it counts on its own. */
function uniqueViews(events: AnalyticsEvent[]): AnalyticsEvent[] {
  const seen = new Set<string>();

  return events.filter((event) => {
    if (event.event_type !== "view") return false;
    if (event.session_id === null) return true;
    if (seen.has(event.session_id)) return false;
    seen.add(event.session_id);
    return true;
  });
}

export type TrafficSource = { domain: string; count: number };

export function trafficSources(events: AnalyticsEvent[], limit = 5): TrafficSource[] {
  const counts = new Map<string, number>();

  for (const event of uniqueViews(events)) {
    const domain = event.referrer_domain ?? "Direct";
    counts.set(domain, (counts.get(domain) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** `avgDwellSeconds` is null when no view of the page reported a dwell time, so the UI can
 * show "no data" instead of a misleading "0s". */
export type CampaignCount = { name: string; count: number };

/** Unique viewers per UTM campaign (falling back to utm_source when no campaign is set), most
 * first. Views with no UTM params at all are left out: "untagged" isn't a campaign, and it is
 * already covered by Traffic sources. UTM params are an allowed signal (root CLAUDE.md). */
export function utmCampaigns(events: AnalyticsEvent[], limit = 5): CampaignCount[] {
  const counts = new Map<string, number>();

  for (const event of uniqueViews(events)) {
    const name = event.utm_campaign ?? event.utm_source;
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export type PageEngagement = { page: number; views: number; avgDwellSeconds: number | null };

export function pageEngagement(events: AnalyticsEvent[]): PageEngagement[] {
  const byPage = new Map<number, { views: number; dwellTotal: number; dwellCount: number }>();

  for (const event of events) {
    if (event.event_type === "download" || event.page_number === null) continue;
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
      avgDwellSeconds:
        entry.dwellCount > 0 ? Math.round(entry.dwellTotal / entry.dwellCount) : null,
    }))
    .sort((a, b) => a.page - b.page);
}

export type NamedCount = { name: string; count: number };

function groupCount(
  events: AnalyticsEvent[],
  key: (event: AnalyticsEvent) => string,
): NamedCount[] {
  const counts = new Map<string, number>();

  for (const event of uniqueViews(events)) {
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

/** The API sends event times as UTC but, from MongoDB, without a "Z" or an
 * offset. `new Date("2026-11-06T01:30:00")` reads that as LOCAL time, which
 * shifts every event by the viewer's UTC offset (8 hours off in California:
 * a 13-hour-old event read "5h ago"). A time with no zone is UTC. */
export function parseEventTime(iso: string): Date {
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso);
  return new Date(hasZone ? iso : `${iso}Z`);
}

/** How far the server's clock is ahead of this browser's, in ms. Event times
 * are server time, so "5h ago" is measured against the server's "now" and a
 * wrong clock or time zone on the viewer's machine cannot skew it. Taken from
 * the `Date` header of API responses; 0 until the first one arrives. */
let serverClockOffsetMs = 0;

export function setServerClock(dateHeader: string | null | undefined): void {
  if (!dateHeader) return;
  const server = Date.parse(dateHeader);
  if (!Number.isNaN(server)) serverClockOffsetMs = server - Date.now();
}

export function serverNow(): number {
  return Date.now() + serverClockOffsetMs;
}

export function formatRelativeTime(iso: string): string {
  const diffMs = serverNow() - parseEventTime(iso).getTime();
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
  return parseEventTime(iso).toLocaleString(undefined, {
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
