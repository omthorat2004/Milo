import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: siteUrl, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/features`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/about`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/path`, lastModified, changeFrequency: "daily", priority: 0.7 },
  ];
}
