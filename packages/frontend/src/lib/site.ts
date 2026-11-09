/**
 * The public origin of the product app. Set NEXT_PUBLIC_SITE_URL when a custom
 * domain is attached. It drives metadataBase, canonical links, robots.txt and
 * sitemap.xml, so it must be the real public origin, never localhost.
 */
const FALLBACK_ORIGIN = "https://milo-frontend-lake.vercel.app";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_ORIGIN).replace(/\/+$/, "");
