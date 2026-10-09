// Pure data operations on the projects array (no file I/O, no ffmpeg).
import { UserError } from "./args.mjs";

export const CATEGORIES = ["film", "travel", "other"];
export const DEFAULT_CREDITS = {
  Camera: "Lumix S5II",
  Lens: "Lumix 20–60mm f/3.5–5.6",
  Post: "DaVinci Resolve",
};

// [person noun used in roles[], activity noun used in credits.Roles, aliases]
const ROLE_PAIRS = [
  ["Director", "Direction", ["director", "direction", "directing"]],
  ["Cinematographer", "Cinematography", ["cinematographer", "cinematography", "dop", "dp", "camera operator"]],
  ["Editor", "Editing", ["editor", "editing", "edit"]],
  ["Colorist", "Color", ["colorist", "colourist", "color", "colour", "coloring", "colouring", "grading", "grade", "color grading", "colour grading"]],
  ["Producer", "Production", ["producer", "production"]],
  ["Photographer", "Photography", ["photographer", "photography"]],
  ["Sound designer", "Sound design", ["sound designer", "sound design", "sound"]],
];

export function normalizeRoles(input) {
  const list = Array.isArray(input) ? input : String(input || "").split(",");
  const roles = [];
  const activities = [];
  for (const raw of list.map((r) => String(r).trim()).filter(Boolean)) {
    const hit = ROLE_PAIRS.find((p) => p[2].includes(raw.toLowerCase()));
    const [person, activity] = hit ? [hit[0], hit[1]] : [raw, raw];
    if (!roles.includes(person)) {
      roles.push(person);
      activities.push(activity);
    }
  }
  return { roles, creditsRoles: activities.join(" · ") };
}

export function validateSlug(slug) {
  if (!slug) throw new UserError("--slug is required.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new UserError(`Invalid slug "${slug}". Use lowercase letters, digits and hyphens only (e.g. "my-project").`);
  }
}

export function findIndex(projects, slug) {
  const i = projects.findIndex((p) => p.slug === slug);
  if (i === -1) throw new UserError(`No project with slug "${slug}". Run "list" to see them.`);
  return i;
}

function firstSentence(text, max = 150) {
  const s = String(text || "").trim();
  const m = s.match(/^.+?[.!?](?=\s|$)/);
  let out = m ? m[0] : s;
  if (out.length > max) out = out.slice(0, max - 1).trimEnd() + "…";
  return out;
}

/** Build a full project entry from validated options. `media` carries already-decided public paths. */
export function buildEntry(o, media) {
  const { roles, creditsRoles } = normalizeRoles(o.roles);
  const credits = { Year: String(o.year), ...(o.location ? { Location: o.location } : {}) };
  if (creditsRoles) credits.Roles = creditsRoles;
  Object.assign(credits, DEFAULT_CREDITS, o.credits || {});

  const videos = o.videos.map((v, i) => ({
    title: v.title,
    youtubeId: v.youtubeId,
    localVideo: "",
    previewVideo: media.previews[i] || "",
  }));

  const entry = {
    slug: o.slug,
    title: o.title,
    subtitle: o.subtitle || [o.tag, o.location].filter(Boolean).join(" · "),
    shortDescription: o.short || firstSentence(o.description),
    tag: o.tag,
    category: o.category,
    year: String(o.year),
    location: o.location || "",
    roles,
    description: o.description,
    previewVideo: media.previews[0] || "",
    coverImage: media.images[0] || "",
  };
  entry.videos = videos;
  if (media.images.length) entry.photoGrid = { title: "Stills", images: media.images };
  entry.credits = credits;
  return placeFlags(entry, {});
}

/** Rebuild an object with `featured` / `hidden` placed right after coverImage, in that order. undefined = remove. */
export function placeFlags(obj, changes) {
  const featured = "featured" in changes ? changes.featured : obj.featured;
  const hidden = "hidden" in changes ? changes.hidden : obj.hidden;
  const flags = {};
  if (featured !== undefined) flags.featured = featured;
  if (hidden !== undefined) flags.hidden = hidden;
  const keys = Object.keys(obj).filter((k) => k !== "featured" && k !== "hidden");
  let at = Math.max(keys.indexOf("coverImage"), keys.indexOf("thumbnail")) + 1;
  if (at === 0) at = keys.indexOf("videos") === -1 ? keys.length : keys.indexOf("videos");
  const out = {};
  keys.forEach((k, i) => {
    if (i === at) Object.assign(out, flags);
    out[k] = obj[k];
  });
  if (at >= keys.length) Object.assign(out, flags);
  return out;
}

/** Set (or replace) a string field. New keys go right after coverImage; existing keys keep their place. */
export function setField(obj, key, value) {
  if (key in obj) return { ...obj, [key]: value };
  const keys = Object.keys(obj);
  const at = keys.indexOf("coverImage") + 1;
  if (at === 0) return { ...obj, [key]: value };
  const out = {};
  keys.forEach((k, i) => {
    if (i === at) out[key] = value;
    out[k] = obj[k];
  });
  if (at >= keys.length) out[key] = value;
  return out;
}

/** Entry for a category "other" case study: no videos, thumbnail instead of a preview clip. */
export function buildCaseEntry(o, thumbnailUrl) {
  const { roles, creditsRoles } = normalizeRoles(o.roles);
  const credits = { Year: String(o.year), ...(o.location ? { Location: o.location } : {}) };
  if (creditsRoles) credits.Roles = creditsRoles;
  Object.assign(credits, o.credits || {});
  return {
    slug: o.slug,
    title: o.title,
    subtitle: o.subtitle || [o.tag, o.location].filter(Boolean).join(" · "),
    shortDescription: o.short || firstSentence(o.description),
    tag: o.tag,
    category: "other",
    year: String(o.year),
    location: o.location || "",
    roles,
    description: o.description,
    previewVideo: "",
    coverImage: "",
    thumbnail: thumbnailUrl,
    videos: [],
    credits,
  };
}

export function insertionIndex(projects, category, position) {
  if (position !== undefined && position !== null && position !== "") {
    const n = Number(position);
    if (!Number.isInteger(n) || n < 1) throw new UserError("--position must be a whole number >= 1 (1 = very first).");
    return Math.min(n - 1, projects.length);
  }
  const i = projects.findIndex((p) => p.category === category);
  return i === -1 ? projects.length : i;
}

/** Place `slug` at featured position n among featured entries; keeps 1..N dense. Returns human-readable changes. */
export function setFeatured(projects, slug, n) {
  const num = Number(n);
  if (!Number.isInteger(num) || num < 1) throw new UserError("Featured position must be a whole number >= 1 (1 = first tile on the landing).");
  const idx = findIndex(projects, slug);
  if (projects[idx].hidden) throw new UserError(`"${slug}" is hidden. Unhide it first.`);
  const before = snapshot(projects);
  const others = projects
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.featured != null && p.slug !== slug)
    .sort((a, b) => a.p.featured - b.p.featured || a.i - b.i)
    .map(({ p }) => p.slug);
  others.splice(Math.min(num - 1, others.length), 0, slug);
  others.forEach((s, k) => {
    const i = findIndex(projects, s);
    projects[i] = placeFlags(projects[i], { featured: k + 1 });
  });
  return diffFeatured(before, snapshot(projects));
}

export function unsetFeatured(projects, slug) {
  const idx = findIndex(projects, slug);
  if (projects[idx].featured == null) throw new UserError(`"${slug}" is not featured.`);
  const before = snapshot(projects);
  projects[idx] = placeFlags(projects[idx], { featured: undefined });
  densify(projects);
  return diffFeatured(before, snapshot(projects));
}

/** Renumber all featured entries to 1..N in their current order. */
export function densify(projects) {
  projects
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.featured != null)
    .sort((a, b) => a.p.featured - b.p.featured || a.i - b.i)
    .forEach(({ p }, k) => {
      const i = projects.findIndex((q) => q.slug === p.slug);
      projects[i] = placeFlags(projects[i], { featured: k + 1 });
    });
}

export function setHidden(projects, slug, hidden) {
  const idx = findIndex(projects, slug);
  const notes = [];
  if (hidden) {
    if (projects[idx].hidden) throw new UserError(`"${slug}" is already hidden.`);
    const wasFeatured = projects[idx].featured != null;
    projects[idx] = placeFlags(projects[idx], { hidden: true });
    if (wasFeatured) notes.push(...unsetFeatured(projects, slug), `(hidden projects cannot be featured, so "${slug}" was unfeatured)`);
  } else {
    if (!projects[idx].hidden) throw new UserError(`"${slug}" is not hidden.`);
    projects[idx] = placeFlags(projects[idx], { hidden: undefined });
  }
  return notes;
}

export function moveTo(projects, slug, position) {
  const from = findIndex(projects, slug);
  const n = Number(position);
  if (!Number.isInteger(n) || n < 1) throw new UserError("Position must be a whole number >= 1 (1 = very first).");
  const [p] = projects.splice(from, 1);
  const to = Math.min(n - 1, projects.length);
  projects.splice(to, 0, p);
  return { from: from + 1, to: to + 1 };
}

function snapshot(projects) {
  return Object.fromEntries(projects.map((p) => [p.slug, p.featured ?? null]));
}
function diffFeatured(a, b) {
  const lines = [];
  for (const s of Object.keys(b)) {
    if (a[s] !== b[s]) lines.push(`featured ${s}: ${a[s] ?? "-"} -> ${b[s] ?? "-"}`);
  }
  return lines;
}

export function listRows(projects) {
  return projects.map((p, i) => ({
    "#": i + 1,
    slug: p.slug,
    category: p.category,
    featured: p.featured ?? "",
    hidden: p.hidden ? "yes" : "",
    videos: (p.videos || []).length,
    preview: p.previewVideo ? p.previewVideo.split("/").pop() : "",
    thumbnail: p.thumbnail ? p.thumbnail.split("/").pop() : "",
  }));
}

export function formatTable(rows) {
  if (!rows.length) return "(no projects)";
  const cols = Object.keys(rows[0]);
  const widths = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c]).length)));
  const line = (cells) => cells.map((c, i) => String(c).padEnd(widths[i])).join("  ").trimEnd();
  return [line(cols), line(widths.map((w) => "-".repeat(w))), ...rows.map((r) => line(cols.map((c) => r[c])))].join("\n");
}
