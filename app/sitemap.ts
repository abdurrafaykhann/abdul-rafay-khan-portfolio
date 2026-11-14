import type { MetadataRoute } from "next";
import { getPublishedSlugs } from "@/lib/data/content";
import { siteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const slugs = await getPublishedSlugs();
  return [
    { url: base, changeFrequency: "monthly", priority: 1 },
    ...slugs.map((slug) => ({
      url: `${base}/work/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
