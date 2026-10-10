#!/usr/bin/env node
// Imports the Havas Play internship work into data/projects.json.
//
//   node scripts/import-havas.mjs [--dry-run] [--keep-text] [--set-featured]
//                                 [--root <repo>] [--manifest <file>] [--copy <file>]
//
// Reads data/havas-manifest.json (media produced by the asset pipeline) and data/havas-copy.json
// (titles, descriptions, roles, order, optional youtubeIds) and upserts one film entry per client
// plus the hub entry (slug havas-play, category "other"). No dependencies. Safe to re-run:
//   - existing entries are updated in place, keeping their position, `featured` and `hidden`
//   - a youtubeId already filled in projects.json is kept (a non-empty one in the copy file wins)
//   - --keep-text keeps the text already in projects.json (title, subtitle, shortDescription,
//     description, roles, video titles and descriptions) and only refreshes media and structure
//   - --set-featured applies the featured numbers from the copy file (hero order); without it
//     `featured` is never touched
// A havas-* entry that is not listed in the copy file is removed. Pieces missing from the manifest disappear from their page.
// New film entries go right after "solene"; the hub goes after the last case study ("other").

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AGENCY = { name: "Havas Play", slug: "havas-play" };
const ANCHOR_SLUG = "solene";
const FILM_TAG = "Agency work";
const ROLE_ACTIVITY = { Filmmaker: "Filming", Editor: "Editing", "Art Director": "Art Direction" };
const KEY_ORDER = [
  "slug", "title", "subtitle", "shortDescription", "tag", "category", "year", "location", "roles",
  "description", "previewVideo", "coverImage", "thumbnail", "agency", "client", "videos", "galleries",
  "credits", "featured", "hidden",
];

// ---- serialiser: same approach as scripts/lib/store.mjs (2-space indent) ----
// store.mjs writes arrays of primitives inline, but data/projects.json as committed spreads them
// over several lines. Detect which style the file is in and keep it, so a run does not reformat
// the whole file. (Once add-project.mjs has rewritten the file the style flips to inline and
// this script follows.)
let INLINE_ARRAYS = false;
function serialize(v, ind = "") {
  if (Array.isArray(v)) {
    if (v.length === 0) return "[]";
    if (INLINE_ARRAYS && v.every((x) => x === null || typeof x !== "object")) return "[" + v.map((x) => JSON.stringify(x)).join(", ") + "]";
    return "[\n" + v.map((x) => ind + "  " + serialize(x, ind + "  ")).join(",\n") + "\n" + ind + "]";
  }
  if (v && typeof v === "object") {
    const keys = Object.keys(v).filter((k) => v[k] !== undefined);
    if (!keys.length) return "{}";
    return "{\n" + keys.map((k) => ind + "  " + JSON.stringify(k) + ": " + serialize(v[k], ind + "  ")).join(",\n") + "\n" + ind + "}";
  }
  return JSON.stringify(v);
}

// ---- args ----
function parseArgs(argv) {
  const a = { dry: false, keepText: false, setFeatured: false, root: null, manifest: null, copy: null };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--dry-run" || x === "--dry") a.dry = true;
    else if (x === "--keep-text") a.keepText = true;
    else if (x === "--set-featured") a.setFeatured = true;
    else if (x === "--root") a.root = argv[++i];
    else if (x === "--manifest") a.manifest = argv[++i];
    else if (x === "--copy") a.copy = argv[++i];
    else if (x === "-h" || x === "--help") {
      console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 16).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
      process.exit(0);
    } else fail(`Unknown argument: ${x}`);
  }
  return a;
}

function fail(msg) {
  console.error(`import-havas: ${msg}`);
  process.exit(1);
}

function readJson(file, what) {
  if (!fs.existsSync(file)) fail(`${what} not found: ${file}`);
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    fail(`${what} is not valid JSON (${file}): ${e.message}`);
  }
}

/** "/videos/x-preview.mp4" -> "/videos/posters/x-preview.webp" (same rule as lib/posters.ts) */
function posterPath(src) {
  const m = src.match(/^(.*)\/([^/]+?)\.[a-z0-9]+$/i);
  return m ? `${m[1]}/posters/${m[2]}.webp` : src;
}

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const nonEmpty = (s) => typeof s === "string" && s.trim() !== "";

// ---- main ----
const args = parseArgs(process.argv.slice(2));
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(args.root || path.join(here, ".."));
const manifestFile = path.resolve(args.manifest || path.join(root, "data", "havas-manifest.json"));
const copyFile = path.resolve(args.copy || path.join(root, "data", "havas-copy.json"));
const projectsFile = path.join(root, "data", "projects.json");

const manifest = readJson(manifestFile, "Manifest");
const copy = readJson(copyFile, "Copy file");
const store = readJson(projectsFile, "projects.json");
INLINE_ARRAYS = /": \[[^\]\n]+\]/.test(fs.readFileSync(projectsFile, "utf8"));
if (!Array.isArray(manifest.clients)) fail("Manifest has no clients array.");
if (!store || !Array.isArray(store.projects)) fail('projects.json has no "projects" array.');
const list = store.projects;
const warnings = [];
const log = [];

const missingFile = (p) => nonEmpty(p) && !fs.existsSync(path.join(root, "public", p.replace(/^\//, "")));

function buildEntry(mc, cc, old) {
  const keep = args.keepText && old;
  const text = (key, fresh) => (keep && nonEmpty(old[key]) ? old[key] : fresh);
  const roles = keep && Array.isArray(old.roles) && old.roles.length ? old.roles : cc.roles;

  const videos = (mc.videos || []).map((v) => {
    const prev =
      (old?.videos || []).find((o) => nonEmpty(v.localVideo) && o.localVideo === v.localVideo) ||
      (old?.videos || []).find((o) => o.title === v.title) ||
      (old?.videos || []).find((o) => nonEmpty(v.previewVideo) && o.previewVideo === v.previewVideo);
    const override = cc.youtubeIds?.[String(v.n)];
    const youtubeId = nonEmpty(override) ? override : nonEmpty(prev?.youtubeId) ? prev.youtubeId : "";
    const hosting = v.hosting === "youtube" ? "youtube" : "self";
    const localVideo = hosting === "self" ? v.localVideo || "" : "";
    const pending = hosting === "youtube" && !youtubeId;
    if (hosting === "self" && !localVideo) warnings.push(`${mc.slug} video ${v.n}: hosting "self" but no localVideo`);
    if (nonEmpty(v.poster) && nonEmpty(v.previewVideo) && v.poster !== posterPath(v.previewVideo)) {
      warnings.push(`${mc.slug} video ${v.n}: poster ${v.poster} is not the one the site derives (${posterPath(v.previewVideo)})`);
    }
    const title = keep && prev && nonEmpty(prev.title) ? prev.title : v.title;
    const description = keep && prev && nonEmpty(prev.description) ? prev.description : "";
    // the manifest `note` describes the poster frame for the editor; it is internal and never published
    const out = {
      title,
      youtubeId,
      localVideo,
      previewVideo: v.previewVideo || "",
      aspect: v.aspect || undefined,
      hosting,
      pending: pending ? true : undefined,
      variants: Array.isArray(v.variants) && v.variants.length ? v.variants : undefined,
      durationSec: v.durationSec ? v.durationSec : undefined,
      description: nonEmpty(description) ? description : undefined,
    };
    for (const f of [out.localVideo, out.previewVideo]) if (missingFile(f)) warnings.push(`${mc.slug}: missing file public${f}`);
    return out;
  });

  const galleries = (mc.galleries || [])
    .filter((g) => Array.isArray(g.images) && g.images.length)
    .map((g) => ({
      title: nonEmpty(g.title) ? g.title : "Visuals",
      images: g.images.map((im) => ({ path: im.path, width: im.width || undefined, height: im.height || undefined })),
    }));
  for (const g of galleries) for (const im of g.images) if (missingFile(im.path)) warnings.push(`${mc.slug}: missing image public${im.path}`);

  const firstPreview = videos.find((v) => nonEmpty(v.previewVideo))?.previewVideo || "";
  const previewVideo = mc.heroPreview || firstPreview;
  if (missingFile(previewVideo)) warnings.push(`${mc.slug}: missing preview public${previewVideo}`);
  const thumbnail = mc.thumbnail || old?.thumbnail || undefined;
  if (thumbnail && missingFile(thumbnail)) warnings.push(`${mc.slug}: missing thumbnail public${thumbnail}`);

  const activities = roles.map((r) => ROLE_ACTIVITY[r] || r).join(" · ");
  const entry = {
    slug: mc.slug,
    title: text("title", cc.title),
    subtitle: text("subtitle", cc.subtitle),
    shortDescription: text("shortDescription", cc.shortDescription),
    tag: FILM_TAG,
    category: "film",
    year: "2026",
    location: "Paris",
    roles,
    description: text("description", cc.description),
    previewVideo,
    coverImage: "",
    thumbnail,
    agency: { ...AGENCY },
    client: cc.client || mc.client,
    videos,
    galleries: galleries.length ? galleries : undefined,
    credits: { Client: cc.client || mc.client, Roles: activities },
  };
  return entry;
}

function buildHub(internalThumb) {
  const h = copy.hub || {};
  const old = list.find((p) => p.slug === (h.slug || AGENCY.slug));
  const keep = args.keepText && old;
  const text = (key, fresh) => (keep && nonEmpty(old[key]) ? old[key] : fresh);
  const roles = keep && Array.isArray(old.roles) && old.roles.length ? old.roles : h.roles || ["Editor", "Art Director"];
  const dedicated = "/images/thumbs/havas-play.webp";
  const thumbnail = fs.existsSync(path.join(root, "public", dedicated)) ? dedicated : internalThumb || h.thumbnail || old?.thumbnail;
  return {
    slug: h.slug || AGENCY.slug,
    title: text("title", h.title),
    subtitle: text("subtitle", h.subtitle),
    shortDescription: text("shortDescription", h.shortDescription),
    tag: h.tag || "Agency",
    category: "other",
    year: "2026",
    location: "Paris",
    roles,
    description: text("description", h.intro),
    previewVideo: "",
    coverImage: "",
    thumbnail,
    videos: [],
    credits: { Year: "January–June 2026", Location: "Paris", Roles: roles.map((r) => ROLE_ACTIVITY[r] || r).join(" · ") },
  };
}

/** Rebuild with the old entry's key order (canonical for new entries), keeping featured/hidden. */
function finalize(entry, old) {
  const merged = { ...entry };
  if (old) {
    if (old.featured !== undefined) merged.featured = old.featured;
    merged.hidden = old.hidden === true;
    for (const k of Object.keys(old)) if (!(k in merged) && !KEY_ORDER.includes(k)) merged[k] = old[k];
  } else {
    merged.hidden = false;
  }
  const out = {};
  // an existing entry keeps its own key order (so a re-run does not shuffle the file); new keys follow the canonical order
  if (old) for (const k of Object.keys(old)) if (merged[k] !== undefined) out[k] = merged[k];
  for (const k of KEY_ORDER) if (merged[k] !== undefined && !(k in out)) out[k] = merged[k];
  for (const k of Object.keys(merged)) if (!(k in out) && merged[k] !== undefined) out[k] = merged[k];
  return out;
}

function describe(e) {
  const v = e.videos || [];
  const self = v.filter((x) => x.localVideo).length;
  const yt = v.filter((x) => x.youtubeId).length;
  const pend = v.filter((x) => x.pending).length;
  const imgs = (e.galleries || []).reduce((n, g) => n + g.images.length, 0);
  return `${v.length} films (${self} self-hosted, ${yt} youtube, ${pend} pending), ${imgs} visuals in ${(e.galleries || []).length} galleries`;
}

// ---- prune: a Havas Play client page that is no longer in the copy file is removed ----
// (copy file = the list of clients on the site; this is how a dropped client such as Orange or BKT stays gone)
let removed = 0;
for (let i = list.length - 1; i >= 0; i--) {
  const p = list[i];
  if (p.agency?.slug === AGENCY.slug && p.slug !== (copy.hub?.slug || AGENCY.slug) && !(copy.clients || {})[p.slug]) {
    list.splice(i, 1);
    removed++;
    log.push(`remove  ${p.slug}  (not in the copy file)`);
  }
}

// ---- upsert film entries, in copy order ----
const clientCopy = copy.clients || {};
const manifestBySlug = new Map(manifest.clients.map((c) => [c.slug, c]));
for (const s of manifestBySlug.keys()) if (!clientCopy[s]) warnings.push(`manifest client ${s} has no entry in the copy file: skipped`);
const ordered = Object.keys(clientCopy)
  .filter((s) => manifestBySlug.has(s))
  .sort((a, b) => (clientCopy[a].order ?? 999) - (clientCopy[b].order ?? 999));
for (const s of Object.keys(clientCopy)) if (!manifestBySlug.has(s)) warnings.push(`copy file lists ${s} but the manifest does not: left as is`);

let anchor = list.findIndex((p) => p.slug === ANCHOR_SLUG);
if (anchor === -1) {
  warnings.push(`"${ANCHOR_SLUG}" not found; new films go to the top of the film group instead`);
  anchor = list.findIndex((p) => p.category === "film") - 1;
}
let inserted = 0;
let updated = 0;
for (const slug of ordered) {
  const mc = manifestBySlug.get(slug);
  const cc = clientCopy[slug];
  const at = list.findIndex((p) => p.slug === slug);
  const old = at >= 0 ? list[at] : undefined;
  const next = finalize(buildEntry(mc, cc, old), old);
  if (old) {
    const changed = Object.keys({ ...old, ...next }).filter((k) => !eq(old[k], next[k]));
    list[at] = next;
    anchor = at;
    updated++;
    log.push(`update  ${slug}  [${changed.length ? changed.join(", ") : "no change"}]  ${describe(next)}`);
  } else {
    list.splice(anchor + 1, 0, next);
    anchor += 1;
    inserted++;
    log.push(`insert  ${slug}  after ${list[anchor - 1].slug}  ${describe(next)}`);
  }
}

// ---- hub ----
const internalThumb = manifestBySlug.get("havas-internal")?.thumbnail;
const hub = buildHub(internalThumb);
const hubAt = list.findIndex((p) => p.slug === hub.slug);
if (hubAt >= 0) {
  const old = list[hubAt];
  const next = finalize(hub, old);
  const changed = Object.keys({ ...old, ...next }).filter((k) => !eq(old[k], next[k]));
  list[hubAt] = next;
  log.push(`update  ${hub.slug} (hub)  [${changed.length ? changed.join(", ") : "no change"}]`);
} else {
  let last = -1;
  list.forEach((p, i) => {
    if (p.category === "other") last = i;
  });
  list.splice(last + 1, 0, finalize(hub, undefined));
  log.push(`insert  ${hub.slug} (hub)  after ${last >= 0 ? list[last].slug : "(start)"}`);
}

// ---- featured ----
if (args.setFeatured) {
  const map = { ...(copy.existingFeatured || {}) };
  for (const [slug, cc] of Object.entries(clientCopy)) if (typeof cc.featured === "number") map[slug] = cc.featured;
  const used = new Map();
  for (const [slug, n] of Object.entries(map)) {
    if (used.has(n)) fail(`featured ${n} is used by both ${used.get(n)} and ${slug}`);
    used.set(n, slug);
  }
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (map[p.slug] !== undefined) {
      const had = p.featured !== undefined;
      p.featured = map[p.slug];
      if (!had) list[i] = finalize(p, p); // put the new `featured` key in its canonical place
    } else if (typeof p.featured === "number") {
      warnings.push(`${p.slug} is featured (${p.featured}) but not in the featured map; left as is`);
    }
  }
}

// ---- report + write ----
const featuredOrder = list
  .filter((p) => typeof p.featured === "number")
  .sort((a, b) => a.featured - b.featured)
  .map((p) => `${p.featured} ${p.slug}`);

console.log(`${args.dry ? "[dry run] " : ""}manifest ${manifestFile}`);
for (const l of log) console.log("  " + l);
console.log(`\n${inserted} inserted, ${updated} updated, ${removed} removed (films); hub ${hubAt >= 0 ? "updated" : "inserted"}; ${list.length} entries in projects.json`);
console.log(`featured order: ${featuredOrder.join(" | ") || "(none)"}`);
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings.slice(0, 40)) console.log("  - " + w);
  if (warnings.length > 40) console.log(`  ... and ${warnings.length - 40} more`);
}

if (args.dry) {
  console.log("\nDry run: nothing written.");
  if (process.env.IMPORT_HAVAS_SHOW) {
    for (const p of list.filter((x) => x.agency || x.slug === hub.slug)) console.log(serialize(p));
  }
} else {
  const text = serialize(store) + "\n";
  const parsed = JSON.parse(text); // throws if we produced garbage
  if (parsed.projects.length !== list.length) fail("Serialization changed the project count; aborting.");
  const tmp = projectsFile + ".tmp";
  fs.writeFileSync(tmp, text);
  JSON.parse(fs.readFileSync(tmp, "utf8"));
  fs.renameSync(tmp, projectsFile);
  console.log(`\nWrote ${projectsFile}`);
}
