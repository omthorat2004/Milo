import type { LinkEvent } from "@/stores/links-store";

export type Summary = {
  views: number;
  uniqueViewers: number;
  downloads: number;
  downloadRate: number | null;
};

export function computeSummary(events: LinkEvent[]): Summary {
  const views = events.filter((event) => event.type === "view");
  const downloads = events.filter((event) => event.type === "download");
  const uniqueViewers = new Set(views.map((event) => event.sessionId)).size;

  return {
    views: views.length,
    uniqueViewers,
    downloads: downloads.length,
    downloadRate: uniqueViewers > 0 ? downloads.length / uniqueViewers : null,
  };
}

export type TrafficSource = { domain: string; count: number };

export function trafficSources(events: LinkEvent[], limit = 5): TrafficSource[] {
  const counts = new Map<string, number>();

  for (const event of events) {
    const domain = event.referrerDomain ?? "Direct";
    counts.set(domain, (counts.get(domain) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export type PageEngagement = { page: number; views: number; avgDwellSeconds: number };

export function pageEngagement(events: LinkEvent[]): PageEngagement[] {
  const byPage = new Map<number, { views: number; dwellTotal: number; dwellCount: number }>();

  for (const event of events) {
    if (event.type !== "view") continue;
    const entry = byPage.get(event.page) ?? { views: 0, dwellTotal: 0, dwellCount: 0 };
    entry.views += 1;
    if (event.dwellSeconds !== null) {
      entry.dwellTotal += event.dwellSeconds;
      entry.dwellCount += 1;
    }
    byPage.set(event.page, entry);
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
  const rest = seconds % 60;
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

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
