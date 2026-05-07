import data from "@/data/projects.json";

export type ProjectVideoEntry = {
  title: string;
  youtubeId?: string;
  localVideo?: string;
  previewVideo?: string;
  description?: string;
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
  previewVideo: string;
  coverImage: string;
  videos: ProjectVideoEntry[];
  credits: Record<string, string>;
  photoGrid?: { title: string; images: string[] };
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
