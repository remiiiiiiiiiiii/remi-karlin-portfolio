import data from "@/data/projects.json";
import type { Project } from "@/lib/projects";
import { getPreviewVideos } from "@/lib/projects";

const all = data.projects as unknown as Project[];

export function isHidden(slug: string): boolean {
  return !!all.find((p) => p.slug === slug)?.hidden;
}

/** Projects with a numeric `featured`, ascending, hidden ones excluded. Empty when the field is not used. */
export function getFeaturedProjects(): Project[] {
  return all
    .filter((p) => typeof p.featured === "number" && !p.hidden)
    .sort((a, b) => (a.featured as number) - (b.featured as number));
}

/** All preview clips of the featured projects, in featured order. Empty when the field is not used. */
export function getFeaturedClips(): string[] {
  const clips: string[] = [];
  getFeaturedProjects().forEach((p) => getPreviewVideos(p).forEach((c) => !clips.includes(c) && clips.push(c)));
  return clips;
}
