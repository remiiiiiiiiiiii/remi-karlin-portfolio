import data from "@/data/projects.json";
import { getHeroClips, type Project } from "@/lib/projects";

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

/** Featured projects that can fill the hero frame (they need at least one hero clip). */
export function getHeroProjects(): Project[] {
  return getFeaturedProjects().filter((p) => getHeroClips(p).length > 0);
}

/** A hub page that groups other projects: they point at it through `agency.slug` or `hub`. */
export function isHub(p: Project): boolean {
  return all.some((q) => q.agency?.slug === p.slug || q.hub === p.slug);
}

/** @deprecated Use isHub. */
export const isAgencyHub = isHub;

/** The first project that points at hub `p`, in projects.json order (hidden ones included). */
function firstChild(p: Project): Project | undefined {
  return all.find((q) => q.agency?.slug === p.slug || q.hub === p.slug);
}

export type WorkGroup = "films" | "cases";

export const WORK_GROUPS: { key: WorkGroup; label: string }[] = [
  { key: "films", label: "Films" },
  { key: "cases", label: "Case studies" },
];

/**
 * Travel films count as films in the index; only the travel hub is listed for them. A hub takes
 * the group of its first child (Havas Play stays under Films, Brand Identity lands under Case studies).
 */
export function groupOf(p: Project): WorkGroup {
  const child = firstChild(p);
  if (child) return groupOf(child);
  return p.category === "film" || p.category === "travel" ? "films" : "cases";
}

/**
 * Travel destinations are reached through the Travel hub and agency work through its hub
 * (Havas Play, Brand Identity), so the index lists the hubs only.
 */
function listedInIndex(p: Project): boolean {
  if (p.hidden) return false;
  if (p.category === "travel" && !p.custom) return false;
  if (p.agency) return false;
  if (p.hub) return false;
  return true;
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
