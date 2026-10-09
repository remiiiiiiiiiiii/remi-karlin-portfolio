import data from "@/data/projects.json";
import type { Project } from "@/lib/projects";

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

/** Featured projects that can fill the hero frame (they need a preview clip). */
export function getHeroProjects(): Project[] {
  return getFeaturedProjects().filter((p) => !!p.previewVideo);
}

export type WorkGroup = "films" | "travel" | "cases";

export const WORK_GROUPS: { key: WorkGroup; label: string }[] = [
  { key: "films", label: "Films" },
  { key: "travel", label: "Travel" },
  { key: "cases", label: "Case studies" },
];

export function groupOf(p: Project): WorkGroup {
  return p.category === "film" ? "films" : p.category === "travel" ? "travel" : "cases";
}

/**
 * Everything listed in the work index, hidden projects excluded: films, then travel, then
 * case studies. Within a group featured projects come first (in featured order), then the
 * order of projects.json.
 */
export function getIndexProjects(): Project[] {
  const rank = (p: Project) => (typeof p.featured === "number" ? p.featured : Number.POSITIVE_INFINITY);
  const order: Record<WorkGroup, number> = { films: 0, travel: 1, cases: 2 };
  return all
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => !p.hidden)
    .sort((a, b) => order[groupOf(a.p)] - order[groupOf(b.p)] || rank(a.p) - rank(b.p) || a.i - b.i)
    .map(({ p }) => p);
}
