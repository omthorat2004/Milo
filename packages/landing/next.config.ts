import type { NextConfig } from "next";

/**
 * Security headers for a static marketing site.
 * The product app (packages/web) will need a looser CSP for PDF.js workers and
 * blob: URLs, deliberately not pre-loosened here.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  /*
   * An EMPTY allowlist, "()", DENIES the feature to every origin including this
   * one. This does not request camera, microphone or location access: it makes
   * them unavailable, so a dependency cannot silently start using them.
   * Removing this line grants access back, it does not revoke it.
   */
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // @milo/ui ships TypeScript source rather than a build step.
  transpilePackages: ["@milo/ui"],
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
