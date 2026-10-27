import { describe, expect, it } from "vitest";

import {
  browserBreakdown,
  computeSummary,
  dailyActivity,
  deviceBreakdown,
  formatDwell,
  formatRelativeTime,
  osBreakdown,
  pageEngagement,
  topLinks,
  trafficSources,
} from "@/lib/links-analytics";
import type { AnalyticsEvent, TrackingLink } from "@/lib/links.api";

function link(overrides: Partial<TrackingLink> = {}): TrackingLink {
  return {
    id: "link-1",
    slug: "abc123",
    share_url: "https://milo.app/l/abc123",
    resume_id: "resume-1",
    resume_title: "My resume",
    resume_source_url: "https://example.com/resume.pdf",
    created_at: new Date().toISOString(),
    expires_at: null,
    revoked_at: null,
    ...overrides,
  };
}

function event(overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
  return {
    id: "e1",
    link_id: "link-1",
    event_type: "view",
    occurred_at: new Date().toISOString(),
    session_id: "sess-1",
    device_category: "desktop",
    browser: "Chrome",
    os: "macOS",
    referrer_domain: "linkedin.com",
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    page_number: 1,
    dwell_time_seconds: null,
    ...overrides,
  };
}

describe("computeSummary", () => {
  it("counts views, downloads, and unique sessions", () => {
    const events = [
      event({ id: "e1", session_id: "s1" }),
      event({ id: "e2", session_id: "s1" }),
      event({ id: "e3", session_id: "s2" }),
      event({ id: "e4", event_type: "download", session_id: "s1" }),
    ];

    const summary = computeSummary(events);

    expect(summary.views).toBe(3);
    expect(summary.downloads).toBe(1);
    expect(summary.uniqueViewers).toBe(2);
    expect(summary.downloadRate).toBeCloseTo(0.5);
  });

  it("reports null download rate with no viewers", () => {
    expect(computeSummary([]).downloadRate).toBeNull();
  });

  it("ignores a null session_id when counting unique viewers", () => {
    const events = [event({ id: "e1", session_id: null }), event({ id: "e2", session_id: null })];

    expect(computeSummary(events).uniqueViewers).toBe(0);
  });
});

describe("trafficSources", () => {
  it("groups by referrer domain, treating null as Direct, sorted descending", () => {
    const events = [
      event({ referrer_domain: "linkedin.com" }),
      event({ referrer_domain: "linkedin.com" }),
      event({ referrer_domain: null }),
    ];

    expect(trafficSources(events)).toEqual([
      { domain: "linkedin.com", count: 2 },
      { domain: "Direct", count: 1 },
    ]);
  });

  it("respects the limit", () => {
    const events = ["a.com", "b.com", "c.com"].map((domain) => event({ referrer_domain: domain }));
    expect(trafficSources(events, 2)).toHaveLength(2);
  });
});

describe("pageEngagement", () => {
  it("averages dwell time per page, counting only view events", () => {
    const events = [
      event({ page_number: 1, dwell_time_seconds: 10 }),
      event({ page_number: 1, dwell_time_seconds: 20 }),
      event({ page_number: 2, dwell_time_seconds: 5 }),
      event({ page_number: 1, event_type: "download", dwell_time_seconds: 999 }),
    ];

    const result = pageEngagement(events);

    expect(result).toEqual([
      { page: 1, views: 2, avgDwellSeconds: 15 },
      { page: 2, views: 1, avgDwellSeconds: 5 },
    ]);
  });

  it("skips events with no page number", () => {
    const events = [event({ page_number: null })];
    expect(pageEngagement(events)).toEqual([]);
  });
});

describe("formatDwell", () => {
  it("formats sub-minute durations as seconds only", () => {
    expect(formatDwell(45)).toBe("45s");
  });

  it("formats durations over a minute as minutes and seconds", () => {
    expect(formatDwell(125)).toBe("2m 5s");
  });
});

describe("formatRelativeTime", () => {
  it("renders 'just now' for the current instant", () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe("just now");
  });

  it("renders minutes for a recent past timestamp", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinutesAgo)).toBe("5m ago");
  });

  it("renders days for an older timestamp", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(threeDaysAgo)).toBe("3d ago");
  });
});

describe("deviceBreakdown / browserBreakdown / osBreakdown", () => {
  it("groups by the field, sorted by count descending", () => {
    const events = [
      event({ device_category: "desktop" }),
      event({ device_category: "desktop" }),
      event({ device_category: "mobile" }),
    ];

    expect(deviceBreakdown(events)).toEqual([
      { name: "desktop", count: 2 },
      { name: "mobile", count: 1 },
    ]);
  });

  it("buckets a null field as Unknown rather than dropping the event", () => {
    const events = [event({ browser: null }), event({ browser: "Chrome" })];

    expect(browserBreakdown(events)).toEqual(
      expect.arrayContaining([
        { name: "Chrome", count: 1 },
        { name: "Unknown", count: 1 },
      ]),
    );
  });

  it("reads the os field independently of device/browser", () => {
    const events = [event({ os: "macOS" }), event({ os: "macOS" }), event({ os: "Windows" })];

    expect(osBreakdown(events)).toEqual([
      { name: "macOS", count: 2 },
      { name: "Windows", count: 1 },
    ]);
  });
});

describe("dailyActivity", () => {
  it("returns exactly `days` buckets, oldest first, zero-filled", () => {
    const result = dailyActivity([], 7);
    expect(result).toHaveLength(7);
    expect(result.every((day) => day.views === 0 && day.downloads === 0)).toBe(true);
  });

  it("counts a view and a download into today's bucket", () => {
    const today = new Date().toISOString();
    const events = [
      event({ event_type: "view", occurred_at: today }),
      event({ event_type: "download", occurred_at: today }),
    ];

    const result = dailyActivity(events, 7);
    const lastBucket = result[result.length - 1];

    expect(lastBucket?.views).toBe(1);
    expect(lastBucket?.downloads).toBe(1);
  });

  it("drops an event older than the requested window", () => {
    const longAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const result = dailyActivity([event({ occurred_at: longAgo })], 7);

    expect(result.every((day) => day.views === 0)).toBe(true);
  });
});

describe("topLinks", () => {
  const statusOf = () => "active" as const;

  it("ranks links by view count descending", () => {
    const links = [
      link({ id: "a", resume_title: "Quiet one" }),
      link({ id: "b", resume_title: "Popular one" }),
    ];
    const events = [
      event({ link_id: "a", event_type: "view" }),
      event({ link_id: "b", event_type: "view" }),
      event({ link_id: "b", event_type: "view" }),
    ];

    const result = topLinks(links, events, statusOf);

    expect(result[0]?.title).toBe("Popular one");
    expect(result[0]?.views).toBe(2);
    expect(result[1]?.title).toBe("Quiet one");
    expect(result[1]?.views).toBe(1);
  });

  it("includes a link with zero events rather than omitting it", () => {
    const links = [link({ id: "a" })];

    const result = topLinks(links, [], statusOf);

    expect(result).toEqual([
      { linkId: "a", title: "My resume", status: "active", views: 0, downloads: 0 },
    ]);
  });

  it("respects the limit", () => {
    const links = [link({ id: "a" }), link({ id: "b" }), link({ id: "c" })];

    expect(topLinks(links, [], statusOf, 2)).toHaveLength(2);
  });
});
