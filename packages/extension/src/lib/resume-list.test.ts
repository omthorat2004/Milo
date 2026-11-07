import { describe, expect, it } from "vitest";

import { groupActiveLinks, isActiveLink, paginate } from "@/lib/resume-list";
import type { TrackingLink } from "@/lib/schemas";

const NOW = new Date("2026-11-07T00:00:00Z");

function link(overrides: Partial<TrackingLink> = {}): TrackingLink {
  return {
    id: "l1",
    slug: "abc",
    share_url: "https://milo.test/l/abc",
    resume_id: "r1",
    created_at: "2026-11-01T00:00:00Z",
    expires_at: null,
    revoked_at: null,
    ...overrides,
  };
}

describe("isActiveLink", () => {
  it("is active with no expiry and no revocation", () => {
    expect(isActiveLink(link(), NOW)).toBe(true);
  });
  it("is inactive when revoked or expired", () => {
    expect(isActiveLink(link({ revoked_at: "2026-11-02T00:00:00Z" }), NOW)).toBe(false);
    expect(isActiveLink(link({ expires_at: "2026-11-06T00:00:00Z" }), NOW)).toBe(false);
  });
  it("is active before its expiry", () => {
    expect(isActiveLink(link({ expires_at: "2026-12-01T00:00:00Z" }), NOW)).toBe(true);
  });
});

describe("groupActiveLinks", () => {
  it("groups by resume, drops inactive links, newest first", () => {
    const grouped = groupActiveLinks(
      [
        link({ id: "old", created_at: "2026-10-01T00:00:00Z" }),
        link({ id: "new", created_at: "2026-11-05T00:00:00Z" }),
        link({ id: "dead", revoked_at: "2026-11-02T00:00:00Z" }),
        link({ id: "other", resume_id: "r2" }),
      ],
      NOW,
    );
    expect(grouped.get("r1")?.map((l) => l.id)).toEqual(["new", "old"]);
    expect(grouped.get("r2")?.map((l) => l.id)).toEqual(["other"]);
  });
});

describe("paginate", () => {
  const items = [1, 2, 3, 4, 5, 6, 7];

  it("slices into pages", () => {
    expect(paginate(items, 0, 3)).toEqual({ items: [1, 2, 3], page: 0, pageCount: 3 });
    expect(paginate(items, 2, 3).items).toEqual([7]);
  });
  it("clamps out-of-range pages and handles empty lists", () => {
    expect(paginate(items, 99, 3).page).toBe(2);
    expect(paginate(items, -1, 3).page).toBe(0);
    expect(paginate([], 0, 3)).toEqual({ items: [], page: 0, pageCount: 1 });
  });
});
