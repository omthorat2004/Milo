import { describe, expect, it } from "vitest";

import {
  computeSummary,
  formatDwell,
  formatRelativeTime,
  pageEngagement,
  trafficSources,
} from "@/lib/links-analytics";
import type { AnalyticsEvent } from "@/lib/links.api";

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
