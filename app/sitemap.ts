import type { MetadataRoute } from "next";
import { projects } from "@/lib/projects";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = ["", "/about"].map(
    (p) => ({
      url: `${SITE_URL}${p}`,
      changeFrequency: "monthly",
      priority: p === "" ? 1 : 0.8,
    })
  );

  // projects.json lists every work page, including the custom case-study pages under app/work/
  const slugs = projects.filter((p) => !p.hidden).map((p) => p.slug);
  const work: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${SITE_URL}/work/${slug}`,
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  return [...staticPages, ...work];
}
