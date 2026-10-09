import type { MetadataRoute } from "next";
import { projects } from "@/lib/projects";
import { SITE_URL } from "@/lib/seo";

// Custom pages under app/work/ that are not driven by projects.json
const CUSTOM_WORK_PAGES = [
  "halatia",
  "unfold-agency",
  "the-outfiters",
  "b1nbags-process",
  "ruinarktefact-process",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = ["", "/video-work", "/other-work", "/about"].map(
    (p) => ({
      url: `${SITE_URL}${p}`,
      changeFrequency: "monthly",
      priority: p === "" ? 1 : 0.8,
    })
  );

  const slugs = [...new Set([...projects.filter((p) => !p.hidden).map((p) => p.slug), ...CUSTOM_WORK_PAGES])];
  const work: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${SITE_URL}/work/${slug}`,
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  return [...staticPages, ...work];
}
