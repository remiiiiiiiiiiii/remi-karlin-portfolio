#!/usr/bin/env node
// Add / feature / hide / reorder / remove portfolio projects without hand-editing code.
// Run `node scripts/add-project.mjs help` for usage. See docs/CONTENT.md for the full recipe.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parseArgs, UserError } from "./lib/args.mjs";
import { parseYoutubeSpec } from "./lib/youtube.mjs";
import { findFfmpeg, encodePreview, makePosters, convertImage } from "./lib/media.mjs";
import { load, save } from "./lib/store.mjs";
import {
  CATEGORIES, buildEntry, insertionIndex, setFeatured, unsetFeatured, setHidden,
  moveTo, densify, findIndex, listRows, formatTable, validateSlug,
} from "./lib/ops.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const HELP = `Usage: node scripts/add-project.mjs <command> [options]

  add (default)   --slug s --title T --category film|travel|other --tag "Music Video" --year 2025
                  [--subtitle S] [--location L] [--roles "Direction,Cinematography,Editing,Colour"]
                  [--description D] [--short D] [--credit "Camera=Sony A7"] (repeatable)
                  [--youtube "URL|Video title"] (repeatable) [--preview clip.mp4] (repeatable, pairs with --youtube in order)
                  [--image still.jpg] (repeatable) [--featured N] [--position N (1 = very first)]
                  [--json file.json] [--force] [--dry-run]
  add-video <slug> --youtube "URL|title" [--preview clip.mp4] [--dry-run]
  feature <slug> <n>     put project n-th on the landing (1 = first tile); others shift to stay 1..N
  unfeature <slug>
  hide <slug> | unhide <slug>
  move <slug> <position>  reorder in projects.json (1 = very first)
  remove <slug> [--delete-media]
  list

Global: --root <dir> (default: the repo this script lives in), --dry-run (print the plan, change nothing).`;

const log = (...a) => console.log(...a);

// ---------- context ----------
function makeCtx(flags) {
  const root = path.resolve(flags.root || process.env.PORTFOLIO_ROOT || path.join(HERE, ".."));
  return {
    root,
    dryRun: !!flags["dry-run"],
    force: !!flags.force,
    pub: (...p) => path.join(root, "public", ...p),
    created: [],
  };
}

const toPublicUrl = (ctx, abs) => "/" + path.relative(path.join(ctx.root, "public"), abs).split(path.sep).join("/");
const toAbs = (ctx, url) => path.join(ctx.root, "public", url.replace(/^\//, ""));

function rollback(ctx) {
  for (const f of ctx.created.reverse()) {
    try { fs.rmSync(f, { force: true }); } catch {}
  }
}

function ensureExists(file, what) {
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) throw new UserError(`${what} not found: ${file}`);
}

function sanitizeImageName(file, used) {
  const base = path.basename(file, path.extname(file)).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "image";
  let name = base, n = 2;
  while (used.has(name)) name = `${base}-${n++}`;
  used.add(name);
  return `${name}.webp`;
}

// ---------- shared media step ----------
/** Encode previews + posters and convert images. Returns public URLs. Records created files for rollback. */
function runMedia(ctx, previewJobs, imageJobs) {
  const ffmpeg = findFfmpeg();
  const track = (f) => ctx.created.push(f);
  for (const j of previewJobs) {
    encodePreview(ffmpeg, j.src, j.out); track(j.out);
    const [big, tiny] = makePosters(ffmpeg, j.out, ctx.pub("videos", "posters")); track(big); track(tiny);
  }
  for (const j of imageJobs) { convertImage(ffmpeg, j.src, j.out); track(j.out); }
}

function checkTargets(ctx, outs) {
  for (const out of outs) {
    if (fs.existsSync(out) && !ctx.force) throw new UserError(`${path.relative(ctx.root, out)} already exists. Pick another slug or pass --force to overwrite.`);
  }
}

// ---------- add ----------
function readJsonOptions(file) {
  ensureExists(file, "--json file");
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  return {
    slug: j.slug, title: j.title, subtitle: j.subtitle, category: j.category, tag: j.tag,
    year: j.year, location: j.location, roles: j.roles, description: j.description,
    short: j.short ?? j.shortDescription, featured: j.featured, position: j.position,
    youtube: arr(j.youtube ?? j.videos), preview: arr(j.preview ?? j.previews), image: arr(j.image ?? j.images),
    credits: j.credits || {},
  };
}

function collectAddOptions(flags) {
  const base = flags.json ? readJsonOptions(flags.json) : { youtube: [], preview: [], image: [], credits: {} };
  const o = { ...base };
  for (const k of ["slug", "title", "subtitle", "category", "tag", "year", "location", "roles", "description", "featured", "position"]) {
    if (flags[k] !== undefined) o[k] = flags[k];
  }
  if (flags.short !== undefined) o.short = flags.short;
  for (const k of ["youtube", "preview", "image"]) if (flags[k]) o[k] = flags[k];
  o.credits = { ...(base.credits || {}) };
  for (const c of flags.credit || []) {
    const eq = c.indexOf("=");
    if (eq < 1) throw new UserError(`--credit needs Key=Value, got "${c}"`);
    o.credits[c.slice(0, eq).trim()] = c.slice(eq + 1).trim();
  }
  return o;
}

function cmdAdd(ctx, flags) {
  const o = collectAddOptions(flags);
  const data = load(ctx.root);
  const { projects } = data;

  // required + shape
  validateSlug(o.slug);
  if (projects.some((p) => p.slug === o.slug)) throw new UserError(`Slug "${o.slug}" already exists in projects.json.`);
  if (fs.existsSync(path.join(ctx.root, "app", "work", o.slug))) throw new UserError(`Slug "${o.slug}" collides with the custom page app/work/${o.slug}/.`);
  const missing = ["title", "category", "tag", "year", "description"].filter((k) => !o[k] || !String(o[k]).trim());
  if (missing.length) throw new UserError(`Missing required: ${missing.map((m) => "--" + m).join(", ")}`);
  if (!CATEGORIES.includes(o.category)) throw new UserError(`--category must be one of: ${CATEGORIES.join(", ")}`);
  if (!/^\d{4}(\s*[–-]\s*\d{2,4})?$/.test(String(o.year))) throw new UserError(`--year must look like 2025 or 2024–25, got "${o.year}"`);
  if (o.featured !== undefined && (!Number.isInteger(Number(o.featured)) || Number(o.featured) < 1)) {
    throw new UserError("--featured must be a whole number >= 1 (1 = first tile on the landing).");
  }

  // videos
  const specs = o.youtube.map(parseYoutubeSpec);
  const seen = new Set();
  specs.forEach((s, i) => {
    if (seen.has(s.youtubeId)) throw new UserError(`Duplicate YouTube id ${s.youtubeId}.`);
    seen.add(s.youtubeId);
    s.title ||= specs.length === 1 ? o.title : `${o.title} ${i + 1}`;
  });
  o.videos = specs;

  // previews
  const previews = o.preview;
  previews.forEach((p) => ensureExists(p, "Preview source"));
  if (previews.length > Math.max(specs.length, 1)) {
    throw new UserError(`${previews.length} previews but ${specs.length} YouTube video(s). Each extra preview needs a --youtube; add it later with add-video.`);
  }
  const previewJobs = previews.map((src, i) => ({
    src,
    out: ctx.pub("videos", previews.length === 1 ? `${o.slug}-preview.mp4` : `${o.slug}-${i + 1}-preview.mp4`),
  }));

  // images
  const used = new Set();
  const imageJobs = o.image.map((src) => {
    ensureExists(src, "Image");
    return { src, out: ctx.pub("images", o.slug, sanitizeImageName(src, used)) };
  });

  checkTargets(ctx, [...previewJobs.map((j) => j.out), ...imageJobs.map((j) => j.out)]);

  const media = { previews: previewJobs.map((j) => toPublicUrl(ctx, j.out)), images: imageJobs.map((j) => toPublicUrl(ctx, j.out)) };
  const entry = buildEntry(o, media);
  const index = insertionIndex(projects, o.category, o.position);

  const warnings = [];
  if (!specs.length) warnings.push("no YouTube video given: the project page will have no player");
  if (!previews.length) warnings.push("no preview clip given: tiles and hero will have no motion (add one later with add-video)");
  if (!o.location) warnings.push("no --location");
  if (!o.short) warnings.push("--short not given: used the first sentence of the description");
  if (!o.subtitle) warnings.push("--subtitle not given: used \"<tag> · <location>\"");

  // plan
  const next = [...projects];
  next.splice(index, 0, entry);
  const featureChanges = o.featured !== undefined ? setFeatured(next, o.slug, Number(o.featured)) : [];

  log(ctx.dryRun ? "DRY RUN: nothing will be written.\n" : "");
  log(`Planned entry for "${o.slug}" (position ${index + 1} of ${next.length} in projects.json):`);
  log(JSON.stringify(next.find((p) => p.slug === o.slug), null, 2));
  for (const j of previewJobs) log(`  preview: ${j.src} -> ${path.relative(ctx.root, j.out)} (+ posters)`);
  for (const j of imageJobs) log(`  image:   ${j.src} -> ${path.relative(ctx.root, j.out)}`);
  featureChanges.forEach((l) => log("  " + l));
  warnings.forEach((w) => log("  note: " + w));
  if (ctx.dryRun) return false;

  try {
    runMedia(ctx, previewJobs, imageJobs);
    data.projects = next;
    save(ctx.root, data);
  } catch (e) {
    rollback(ctx);
    throw e;
  }
  log(`\nAdded "${o.slug}".`);
  return true;
}

// ---------- add-video ----------
function cmdAddVideo(ctx, slug, flags) {
  if (!slug) throw new UserError("Usage: add-video <slug> --youtube \"URL|title\" [--preview file]");
  const data = load(ctx.root);
  const idx = findIndex(data.projects, slug);
  const project = data.projects[idx];
  const specs = (flags.youtube || []).map(parseYoutubeSpec);
  if (!specs.length) throw new UserError("add-video needs --youtube \"URL|title\".");
  const previews = flags.preview || [];
  previews.forEach((p) => ensureExists(p, "Preview source"));
  if (previews.length > specs.length) throw new UserError(`${previews.length} previews but ${specs.length} YouTube video(s).`);

  const existingIds = new Set(project.videos.map((v) => v.youtubeId));
  const taken = new Set(data.projects.flatMap((p) => [p.previewVideo, ...p.videos.map((v) => v.previewVideo)]).filter(Boolean));
  let n = project.videos.length + 1;
  const previewJobs = [];
  const newVideos = specs.map((s, i) => {
    if (existingIds.has(s.youtubeId)) throw new UserError(`"${slug}" already has video ${s.youtubeId}.`);
    existingIds.add(s.youtubeId);
    let previewVideo = "";
    if (previews[i]) {
      let url;
      do { url = `/videos/${slug}-${n++}-preview.mp4`; } while (taken.has(url) || fs.existsSync(toAbs(ctx, url)));
      taken.add(url);
      previewJobs.push({ src: previews[i], out: toAbs(ctx, url) });
      previewVideo = url;
    }
    return { title: s.title || `${project.title} ${project.videos.length + i + 1}`, youtubeId: s.youtubeId, localVideo: "", previewVideo };
  });

  log(ctx.dryRun ? "DRY RUN: nothing will be written.\n" : "");
  log(`Planned new video(s) for "${slug}":`);
  log(JSON.stringify(newVideos, null, 2));
  for (const j of previewJobs) log(`  preview: ${j.src} -> ${path.relative(ctx.root, j.out)} (+ posters)`);
  if (!project.previewVideo && newVideos[0].previewVideo) log("  note: project had no previewVideo, using the first new one");
  if (ctx.dryRun) return false;

  try {
    runMedia(ctx, previewJobs, []);
    project.videos.push(...newVideos);
    if (!project.previewVideo && newVideos[0].previewVideo) project.previewVideo = newVideos[0].previewVideo;
    save(ctx.root, data);
  } catch (e) {
    rollback(ctx);
    throw e;
  }
  log(`\nAdded ${newVideos.length} video(s) to "${slug}" (now ${project.videos.length}).`);
  return true;
}

// ---------- small state commands ----------
function mutate(ctx, fn) {
  const data = load(ctx.root);
  const lines = fn(data.projects) || [];
  lines.forEach((l) => log("  " + l));
  if (ctx.dryRun) { log("DRY RUN: nothing written."); return false; }
  save(ctx.root, data);
  return true;
}

function referencedUrls(p) {
  return [
    p.previewVideo, p.coverImage, p.bannerImage, p.instagramGridImage, p.mascotImage, p.campaignDesignImage,
    ...(p.videos || []).flatMap((v) => [v.previewVideo, v.localVideo]),
    ...((p.photoGrid && p.photoGrid.images) || []),
  ].filter((u) => typeof u === "string" && u.startsWith("/"));
}

function cmdRemove(ctx, slug, flags) {
  if (!slug) throw new UserError("Usage: remove <slug> [--delete-media]");
  const data = load(ctx.root);
  const idx = findIndex(data.projects, slug);
  const [gone] = data.projects.splice(idx, 1);
  const others = new Set(data.projects.flatMap(referencedUrls));
  const orphan = [...new Set(referencedUrls(gone))].filter((u) => !others.has(u));
  const files = new Set();
  for (const u of orphan) {
    files.add(toAbs(ctx, u));
    if (u.startsWith("/videos/") && u.endsWith("-preview.mp4")) {
      const b = path.basename(u, ".mp4");
      files.add(ctx.pub("videos", "posters", `${b}.webp`));
      files.add(ctx.pub("videos", "posters", `${b}-tiny.webp`));
    }
  }
  const existing = [...files].filter((f) => fs.existsSync(f));
  densify(data.projects);
  log(`Removing "${slug}" from projects.json (it was position ${idx + 1}).`);
  if (!existing.length) log("  no media files owned only by this project.");
  existing.forEach((f) => log(`  ${flags["delete-media"] ? (ctx.dryRun ? "would delete" : "delete") : "left in place"}: ${path.relative(ctx.root, f)}`));
  if (ctx.dryRun) { log("DRY RUN: nothing written."); return false; }
  save(ctx.root, data);
  if (flags["delete-media"]) {
    for (const f of existing) fs.rmSync(f, { force: true });
    const imgDir = ctx.pub("images", slug);
    if (fs.existsSync(imgDir) && fs.readdirSync(imgDir).length === 0) fs.rmdirSync(imgDir);
  } else if (existing.length) {
    log("  (pass --delete-media to delete those files too)");
  }
  log("  note: custom pages under app/work/ and links in other files are not touched.");
  return true;
}

// ---------- output helpers ----------
function gitSummary(ctx) {
  const git = (...args) => spawnSync("git", ["-C", ctx.root, ...args], { encoding: "utf8" });
  const top = git("rev-parse", "--show-toplevel");
  if (top.status !== 0) return;
  let real; try { real = fs.realpathSync(ctx.root); } catch { real = ctx.root; }
  if (fs.realpathSync(top.stdout.trim()) !== real) return;
  const stat = git("diff", "--stat", "--", "data/projects.json", "public");
  const untracked = git("status", "--short", "--untracked-files=all", "--", "public").stdout.split("\n").filter((l) => l.startsWith("??"));
  log("\ngit diff --stat (data/ and public/):");
  log(stat.stdout.trim() || "  (no tracked changes)");
  if (untracked.length) log("New files:\n" + untracked.map((l) => "  " + l.slice(3)).join("\n"));
  log("\nNothing is committed. Next: npx tsc --noEmit, check locally, then commit + push (see docs/CONTENT.md).");
}

// ---------- main ----------
function main() {
  const { flags, positionals } = parseArgs(process.argv.slice(2));
  const known = new Set(["add", "add-video", "feature", "unfeature", "hide", "unhide", "move", "remove", "list", "help"]);
  let cmd = positionals[0];
  let args = positionals.slice(1);
  if (!cmd || !known.has(cmd)) {
    if (cmd) throw new UserError(`Unknown command "${cmd}". Run "help".`);
    cmd = Object.keys(flags).length && !flags.help ? "add" : "help";
  }
  if (flags.help || cmd === "help") return log(HELP);

  const ctx = makeCtx(flags);
  let changed = false;
  switch (cmd) {
    case "add": changed = cmdAdd(ctx, flags); break;
    case "add-video": changed = cmdAddVideo(ctx, args[0], flags); break;
    case "feature":
      if (!args[0] || !args[1]) throw new UserError("Usage: feature <slug> <n>");
      changed = mutate(ctx, (ps) => setFeatured(ps, args[0], args[1])); break;
    case "unfeature":
      if (!args[0]) throw new UserError("Usage: unfeature <slug>");
      changed = mutate(ctx, (ps) => unsetFeatured(ps, args[0])); break;
    case "hide":
    case "unhide":
      if (!args[0]) throw new UserError(`Usage: ${cmd} <slug>`);
      changed = mutate(ctx, (ps) => setHidden(ps, args[0], cmd === "hide")); break;
    case "move":
      if (!args[0] || !args[1]) throw new UserError("Usage: move <slug> <position>");
      changed = mutate(ctx, (ps) => { const r = moveTo(ps, args[0], args[1]); return [`moved ${args[0]}: ${r.from} -> ${r.to}`]; }); break;
    case "remove": changed = cmdRemove(ctx, args[0], flags); break;
    case "list": log(formatTable(listRows(load(ctx.root).projects))); return;
  }
  if (changed) gitSummary(ctx);
}

try {
  main();
} catch (e) {
  if (e instanceof UserError) {
    console.error("Error: " + e.message);
    process.exit(1);
  }
  throw e;
}
