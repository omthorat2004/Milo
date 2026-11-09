import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Signed-in screens and shared tracking links are not search content.
      // /l/ is a candidate's resume link, which must never be indexed.
      disallow: [
        "/l/",
        "/dashboard",
        "/links",
        "/logs",
        "/account",
        "/login",
        "/register",
        "/verify",
        "/forgot-password",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
