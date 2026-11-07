import { describe, expect, it } from "vitest";

import { loginUrlFor, safeRedirectTarget } from "@/lib/safe-redirect";

describe("safeRedirectTarget", () => {
  it("keeps same-origin paths with query strings", () => {
    expect(safeRedirectTarget("/links/abc?tab=pages")).toBe("/links/abc?tab=pages");
  });

  it("falls back for empty or missing values", () => {
    expect(safeRedirectTarget(null)).toBe("/dashboard");
    expect(safeRedirectTarget("")).toBe("/dashboard");
  });

  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "javascript:alert(1)",
    "/\t/evil.com",
    "dashboard",
  ])("rejects %s", (value) => {
    expect(safeRedirectTarget(value)).toBe("/dashboard");
  });

  it("never redirects back into an auth page", () => {
    expect(safeRedirectTarget("/login?from=/x")).toBe("/dashboard");
    expect(safeRedirectTarget("/verify")).toBe("/dashboard");
  });
});

describe("loginUrlFor", () => {
  it("encodes the destination", () => {
    expect(loginUrlFor("/links/abc?x=1")).toBe("/login?from=%2Flinks%2Fabc%3Fx%3D1");
  });

  it("omits from for auth pages", () => {
    expect(loginUrlFor("/login")).toBe("/login");
  });
});
