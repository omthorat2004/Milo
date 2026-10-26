import { describe, expect, it } from "vitest";

import { linkStatus, type TrackingLink } from "@/lib/links.api";

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

describe("linkStatus", () => {
  it("is active with no expiry and no revocation", () => {
    expect(linkStatus(link())).toBe("active");
  });

  it("is revoked once revoked_at is set, even if also expired", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(linkStatus(link({ revoked_at: past, expires_at: past }))).toBe("revoked");
  });

  it("is expired once expires_at is in the past", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(linkStatus(link({ expires_at: past }))).toBe("expired");
  });

  it("is active when expires_at is in the future", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(linkStatus(link({ expires_at: future }))).toBe("active");
  });
});
