import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: siteConfig.url, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${siteConfig.url}/path`, lastModified, changeFrequency: "daily", priority: 0.7 },
    { url: `${siteConfig.url}/privacy`, lastModified, changeFrequency: "monthly", priority: 0.5 },
  ];
}
