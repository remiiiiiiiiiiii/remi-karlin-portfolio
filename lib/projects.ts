import data from "@/data/projects.json";

export type ProjectVideoEntry = {
  title: string;
  youtubeId?: string;
  localVideo?: string;
  previewVideo?: string;
  description?: string;
  /** "9:16" | "16:9" | "1:1" | "4:5" | "3:2" | "other". Sizes the native player. */
  aspect?: string;
  /** "self" = native player on localVideo; "youtube" = facade (or pending until a youtubeId is filled). */
  hosting?: "self" | "youtube";
  /** true while hosting is "youtube" and youtubeId is still empty: poster plus "Full film coming soon". */
  pending?: boolean;
  /** Other cuts of the same film, e.g. ["6s", "10s"]. */
  variants?: string[];
  durationSec?: number;
};

export type ProjectGallery = {
  title: string;
  images: { path: string; width?: number; height?: number }[];
};

export type Project = {
  slug: string;
  title: string;
  subtitle: string;
  shortDescription: string;
  tag: string;
  category: "film" | "travel" | "other";
  year: string;
  location: string;
  roles: string[];
  description: string;
  /** May be "" (category "other" projects have no clip). Guard before building a poster path. */
  previewVideo: string;
  coverImage: string;
  /** Still for the homepage index, e.g. /images/thumbs/<slug>.webp. Falls back to the preview poster. */
  thumbnail?: string;
  videos: ProjectVideoEntry[];
  credits: Record<string, string>;
  /** 1 = first tile on the landing; absent = not on the landing */
  featured?: number;
  /** true = page exists but is listed nowhere */
  hidden?: boolean;
  photoGrid?: { title: string; images: string[] };
  /** Agency the work was made for, e.g. { name: "Havas Play", slug: "havas-play" }. slug is the hub page /work/<slug>. */
  agency?: { name: string; slug: string };
  /** Brand the work was made for (the agency's client). */
  client?: string;
  galleries?: ProjectGallery[];
  instagram?: string;
  instagramUrl?: string;
  bannerImage?: string;
  instagramGridImage?: string;
  campaignBody?: string;
  mascotImage?: string;
  campaignDesignImage?: string;
};

export const projects: Project[] = data.projects as unknown as Project[];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

export function getProjectIndex(slug: string): number {
  return projects.findIndex((p) => p.slug === slug);
}

/** All unique preview clips for a project, in order. */
export function getPreviewVideos(project: Project): string[] {
  const all = [
    project.previewVideo,
    ...project.videos.map((v) => v.previewVideo).filter((v): v is string => !!v),
  ];
  return [...new Set(all)].filter(Boolean);
}

/**
 * Clips for the full-bleed 16:9 desktop hero. Vertical (9:16, 4:5) clips would be cropped to a
 * thin slice, so they are left out; the project's own previewVideo always stays first. Clips with
 * no aspect info are kept.
 */
export function getHeroClips(project: Project): string[] {
  return getPreviewVideos(project).filter((src, i) => {
    if (i === 0) return true;
    const aspect = project.videos.find((v) => v.previewVideo === src)?.aspect;
    return aspect !== "9:16" && aspect !== "4:5";
  });
}

/** Period line shown next to the agency name on its projects. */
const AGENCY_DETAIL: Record<string, string> = {
  "havas-play": "Paris · Jan–Jun 2026",
};

export function agencyLine(agency: NonNullable<Project["agency"]>): string {
  const detail = AGENCY_DETAIL[agency.slug];
  return detail ? `${agency.name} · ${detail}` : agency.name;
}

export function countGalleryImages(p: Project): number {
  return (p.galleries ?? []).reduce((n, g) => n + g.images.length, 0);
}

/**
 * Every project made for an agency (project.agency.slug === agencySlug), hidden ones excluded,
 * excluding `exceptSlug`. Sorted by `order` (lower first); projects without one keep their
 * projects.json order, after the numbered ones.
 */
export function getAgencyProjects(
  agencySlug: string,
  order: Record<string, number> = {},
  exceptSlug?: string
): Project[] {
  return projects
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.agency?.slug === agencySlug && !p.hidden && p.slug !== exceptSlug)
    .sort(
      (a, b) =>
        (order[a.p.slug] ?? Number.POSITIVE_INFINITY) - (order[b.p.slug] ?? Number.POSITIVE_INFINITY) || a.i - b.i
    )
    .map(({ p }) => p);
}
