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

export type WorkGroup = "films" | "cases";

export const WORK_GROUPS: { key: WorkGroup; label: string }[] = [
  { key: "films", label: "Films" },
  { key: "cases", label: "Case studies" },
];

/** Travel films count as films in the index; only the Travel hub is listed for them. */
export function groupOf(p: Project): WorkGroup {
  return p.category === "film" || p.category === "travel" ? "films" : "cases";
}

/** Travel destinations are reached through the Travel hub, so the index lists the hub only. */
function listedInIndex(p: Project): boolean {
  return !p.hidden && !(p.category === "travel" && !p.custom);
}

/**
 * Everything listed in the work index: films (travel = the hub only), then case studies.
 * Hidden projects are excluded. Within a group featured projects come first (in featured
 * order), then the order of projects.json.
 */
export function getIndexProjects(): Project[] {
  const rank = (p: Project) => (typeof p.featured === "number" ? p.featured : Number.POSITIVE_INFINITY);
  const order: Record<WorkGroup, number> = { films: 0, cases: 1 };
  return all
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => listedInIndex(p))
    .sort((a, b) => order[groupOf(a.p)] - order[groupOf(b.p)] || rank(a.p) - rank(b.p) || a.i - b.i)
    .map(({ p }) => p);
}
