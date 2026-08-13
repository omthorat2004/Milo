/** Single source of truth for site-wide constants and marketing copy claims. */

export const siteConfig = {
  name: "Milo",
  tagline: "Know when your resume gets seen.",
  description:
    "Share your resume through Milo and see when it's viewed, downloaded, and where the traffic came from. Anonymous analytics only, never who.",
  /**
   * Set NEXT_PUBLIC_SITE_URL to the real origin at deploy time, the Vercel URL
   * first, a custom domain later. It drives canonical links, sitemap.xml and
   * the Open Graph tags, so a wrong value here breaks link previews.
   */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  status: "Private beta · building in the open",
} as const;

/**
 * Launch-time flags.
 *
 * `showWaitlistCount` stays off until the number is genuinely persuasive, a
 * small count is worse social proof than no count. Flip it, and the closing
 * section renders the figure from the admin endpoint.
 */
export const featureFlags = {
  showWaitlistCount: false,
} as const;

/**
 * What Milo does and does not record. Rendered on the landing page and on
 * /privacy from this one list so the two can never drift apart.
 */
export const collectedSignals = [
  "Timestamp of the view",
  "An anonymous session ID, scoped to one resume",
  "Device category, desktop, mobile or tablet",
  "Browser and operating system",
  "Referrer domain, e.g. linkedin.com",
  "UTM parameters you added to your own link",
  "Which page of the resume was on screen",
  "Roughly how long each page was open",
  "Whether the PDF was opened and whether it was downloaded",
] as const;

export const neverCollected = [
  "IP addresses shown to you, or stored longer than a request needs",
  "City, country, or any location derived from an address",
  "GPS or precise location",
  "Names, emails, or LinkedIn profiles of viewers",
  "Device fingerprints",
  "Tracking across other websites",
  "Camera, microphone, or browser history",
] as const;
