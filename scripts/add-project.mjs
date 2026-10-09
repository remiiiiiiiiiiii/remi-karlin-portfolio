#!/usr/bin/env node
// Add / feature / hide / reorder / remove portfolio projects without hand-editing code.
// Run `node scripts/add-project.mjs help` for usage. See docs/CONTENT.md for the full recipe.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parseArgs, UserError } from "./lib/args.mjs";
import { parseYoutubeSpec, parseYoutubeId } from "./lib/youtube.mjs";
import os from "node:os";
import { findFfmpeg, encodePreview, encodeFull, makePosters, convertImage, makeThumbnail, probeMedia, findOptimizer, runOptimizer } from "./lib/media.mjs";
import { load, save } from "./lib/store.mjs";
import {
  CATEGORIES, buildEntry, insertionIndex, setFeatured, unsetFeatured, setHidden,
  moveTo, densify, findIndex, listRows, formatTable, validateSlug, setField, buildCaseEntry,
  FULL_MAX_SEC, classifyAspect, parseAspect, parseAgency, parseFullSpec, isPending, pendingCount, setBefore,
} from "./lib/ops.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const HELP = `Usage: node scripts/add-project.mjs <command> [options]

  add (default)   --slug s --title T --category film|travel|other --tag "Music Video" --year 2025
                  [--subtitle S] [--location L] [--roles "Direction,Cinematography,Editing,Colour"]
                  [--description D] [--short D] [--credit "Camera=Sony A7"] (repeatable)
                  [--youtube "URL|Video title"] (repeatable) [--preview clip.mp4] (repeatable, pairs with --youtube in order)
                  [--image still.jpg] (repeatable) [--featured N] [--position N (1 = very first)]
                  [--full "film.mp4|title"] (repeatable) self-host a full film: /videos/full/<slug>-<n>.mp4, H.264 CRF 26,
                      long edge <= 1920, AAC 128k, faststart; sets localVideo, hosting, aspect, durationSec. Warns above ${FULL_MAX_SEC} s
                  [--pending "Title"] (repeatable) a film that will go on YouTube later (no id yet; fill it with set-youtube)
                  [--aspect 9:16|16:9|1:1|4:5|3:2|other] (override the detected aspect of the new videos)
                  [--agency "Havas Play|havas-play"] [--client "KFC"]
                  [--json file.json] [--force] [--dry-run]
  add-video <slug> [--youtube "URL|title"] [--full "film.mp4|title"] [--pending "Title"] [--aspect A] [--preview clip.mp4] [--dry-run]
  set-youtube <slug> <n|title> <url>   fill the YouTube id of video n (1-based) or the one whose title matches; clears pending,
                              keeps localVideo (--force replaces an id that is already set)
  add-gallery <slug> --title "Stills" --image still.jpg (repeatable)   WebP, long edge 1600, into public/images/<slug>/, appended to galleries[]
  feature <slug> <n>     put project n-th on the landing (1 = first tile); others shift to stay 1..N
  unfeature <slug>
  hide <slug> | unhide <slug>
  move <slug> <position>  reorder in projects.json (1 = very first)
  set-preview <slug> <file>   which existing clip represents the project on the homepage hero/grid
                              (file name, /videos/x.mp4 or path under public/videos; must be one of the project's own
                              video previews unless --force)
  set-thumbnail <slug> <image> [--y 0..1]  2.39:1 WebP (1280x536) at public/images/thumbs/<slug>.webp, sets "thumbnail"
                              (--y = vertical crop anchor: 0 top, 0.5 centre (default), 1 bottom)
  add-case        --slug s --title T --tag "Brand Identity" --year 2025 --description D --thumbnail image.jpg
                  [--subtitle S] [--location L] [--roles "Art Director,Brand Designer"] [--short D]
                  [--credit "Key=Value"] (repeatable) [--agency "Name|slug"] [--client C] [--position N] [--y 0..1] [--force]
                  adds a category "other" entry; the custom page app/work/<slug>/ is still yours to create
  remove <slug> [--delete-media]
  list            slug, category, featured, hidden, videos, pending (videos waiting for YouTube), preview clip, thumbnail

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
/** One preview: through scripts/optimize-media.mjs when the repo has it (its poster rules), else the embedded ffmpeg commands. */
function processPreview(ctx, job, track) {
  const opt = findOptimizer(ctx.root);
  const postersDir = ctx.pub("videos", "posters");
  const base = path.basename(job.out, ".mp4");
  const posters = [path.join(postersDir, `${base}.webp`), path.join(postersDir, `${base}-tiny.webp`)];
  if (opt) {
    for (const f of posters) fs.rmSync(f, { force: true }); // optimize-media only writes posters that are missing
    fs.mkdirSync(path.dirname(job.out), { recursive: true });
    fs.copyFileSync(job.src, job.out); track(job.out);
    posters.forEach(track);
    runOptimizer(opt, ctx.root, [path.relative(ctx.root, job.out)], `preview ${path.basename(job.src)}`);
    for (const f of posters) if (!fs.existsSync(f)) throw new UserError(`optimize-media did not write ${path.relative(ctx.root, f)}.`);
    return;
  }
  const ffmpeg = findFfmpeg();
  encodePreview(ffmpeg, job.src, job.out); track(job.out);
  const [big, tiny] = makePosters(ffmpeg, job.out, postersDir); track(big); track(tiny);
}

/** Encode previews + posters, full films and images. Records created files for rollback. */
function runMedia(ctx, previewJobs, imageJobs, fullJobs = []) {
  const track = (f) => ctx.created.push(f);
  for (const j of previewJobs) processPreview(ctx, j, track);
  if (fullJobs.length) {
    const ffmpeg = findFfmpeg();
    for (const j of fullJobs) {
      encodeFull(ffmpeg, j.src, j.out); track(j.out);
      const mb = fs.statSync(j.out).size / 1048576;
      log(`  full film: ${path.relative(ctx.root, j.out)} (${mb.toFixed(1)} MB)`);
      if (mb > 12) log(`  note: ${mb.toFixed(1)} MB is over the ~12 MB guideline: the file is committed to git. Trim the film or host it on YouTube.`);
    }
  }
  if (imageJobs.length) {
    const ffmpeg = findFfmpeg();
    for (const j of imageJobs) { convertImage(ffmpeg, j.src, j.out); track(j.out); }
  }
}

/** 2.39:1 thumbnail pair for a slug, via optimize-media's `thumb` command when it has one. Returns the public URL. */
function makeThumb(ctx, src, slug, y) {
  const dir = ctx.pub("images", "thumbs");
  const big = path.join(dir, `${slug}.webp`);
  const tiny = path.join(dir, `${slug}-tiny.webp`);
  ctx.created.push(big, tiny);
  const opt = findOptimizer(ctx.root);
  if (opt && opt.thumb) runOptimizer(opt, ctx.root, ["thumb", path.resolve(src), slug, ...(y === undefined ? [] : ["--y", String(y)])], `thumbnail ${path.basename(src)}`);
  else makeThumbnail(findFfmpeg(), src, dir, slug, y === undefined ? 0.5 : y);
  for (const f of [big, tiny]) if (!fs.existsSync(f)) throw new UserError(`Thumbnail step did not write ${path.relative(ctx.root, f)}.`);
  return toPublicUrl(ctx, big);
}

function checkTargets(ctx, outs) {
  for (const out of outs) {
    if (fs.existsSync(out) && !ctx.force) throw new UserError(`${path.relative(ctx.root, out)} already exists. Pick another slug or pass --force to overwrite.`);
  }
}

// ---------- full films / pending videos ----------
/**
 * --full files and --pending titles -> video objects (+ encode jobs for the full films).
 * `first` = how many videos the project already lists (or are planned before these), so files are numbered <slug>-<n>.mp4.
 * `bump` (add-video): skip numbers whose file already exists. Without it (add) an existing file is an error later (checkTargets).
 */
function planExtraVideos(ctx, { slug, projectTitle, first, total, full, pending, aspect, bump, taken }) {
  const videos = [], jobs = [], notes = [];
  const specs = (full || []).map(parseFullSpec);
  const ffmpeg = specs.length ? findFfmpeg() : null;
  let n = first;
  for (const s of specs) {
    ensureExists(s.file, "Full film source");
    const info = probeMedia(ffmpeg, s.file);
    const dur = Math.round(info.duration);
    n++;
    let url = `/videos/full/${slug}-${n}.mp4`;
    while (bump && (taken.has(url) || fs.existsSync(toAbs(ctx, url)))) url = `/videos/full/${slug}-${++n}.mp4`;
    taken.add(url);
    const title = s.title || (total === 1 ? projectTitle : `${projectTitle} ${n}`);
    videos.push({ title, youtubeId: "", localVideo: url, hosting: "self", aspect: aspect || classifyAspect(info.width, info.height), durationSec: dur });
    jobs.push({ src: s.file, out: toAbs(ctx, url) });
    notes.push(`${path.basename(s.file)}: ${info.width}x${info.height}, ${dur} s -> aspect ${videos.at(-1).aspect}`);
    if (dur > FULL_MAX_SEC) {
      notes.push(`WARNING: ${path.basename(s.file)} is ${dur} s, over the ${FULL_MAX_SEC} s rule for self-hosting. Upload it to YouTube and use set-youtube instead (add it with --pending "${title}" now). It will be encoded and committed as is.`);
    }
  }
  for (const title of pending || []) {
    const t = String(title).trim();
    if (!t) throw new UserError('--pending needs a title, e.g. --pending "Renault 60 s".');
    videos.push({ title: t, youtubeId: "", localVideo: "", hosting: "youtube", ...(aspect ? { aspect } : {}), pending: true });
  }
  return { videos, jobs, notes };
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
    credits: j.credits || {}, thumbnail: j.thumbnail,
    full: arr(j.full), pending: arr(j.pending), aspect: j.aspect, agency: j.agency, client: j.client,
  };
}

function collectAddOptions(flags) {
  const base = flags.json ? readJsonOptions(flags.json) : { youtube: [], preview: [], image: [], credits: {}, full: [], pending: [] };
  const o = { ...base };
  for (const k of ["slug", "title", "subtitle", "category", "tag", "year", "location", "roles", "description", "featured", "position", "thumbnail", "aspect", "agency", "client"]) {
    if (flags[k] !== undefined) o[k] = flags[k];
  }
  if (flags.short !== undefined) o.short = flags.short;
  for (const k of ["youtube", "preview", "image", "full", "pending"]) if (flags[k]) o[k] = flags[k];
  o.agency = parseAgency(o.agency);
  o.aspect = parseAspect(o.aspect);
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
    s.title ||= specs.length + o.full.length + o.pending.length === 1 ? o.title : `${o.title} ${i + 1}`;
    if (o.aspect) s.aspect = o.aspect;
  });
  const extra = planExtraVideos(ctx, {
    slug: o.slug, projectTitle: o.title, first: specs.length, total: specs.length + o.full.length + o.pending.length,
    full: o.full, pending: o.pending, aspect: o.aspect, bump: false, taken: new Set(),
  });
  o.videos = [...specs, ...extra.videos];
  const fullJobs = extra.jobs;

  // previews
  const previews = o.preview;
  previews.forEach((p) => ensureExists(p, "Preview source"));
  if (previews.length > Math.max(o.videos.length, 1)) {
    throw new UserError(`${previews.length} previews but ${o.videos.length} video(s). Each extra preview needs a video; add it later with add-video.`);
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

  checkTargets(ctx, [...previewJobs.map((j) => j.out), ...imageJobs.map((j) => j.out), ...fullJobs.map((j) => j.out)]);

  const media = { previews: previewJobs.map((j) => toPublicUrl(ctx, j.out)), images: imageJobs.map((j) => toPublicUrl(ctx, j.out)) };
  const entry = buildEntry(o, media);
  const index = insertionIndex(projects, o.category, o.position);

  const warnings = [];
  if (!o.videos.length) warnings.push("no video given (--youtube, --full or --pending): the project page will have no player");
  extra.notes.forEach((w) => warnings.push(w));
  if (o.videos.some((v) => v.pending)) warnings.push('pending film(s): fill the YouTube id later with "set-youtube <slug> <n|title> <url>"');
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
  for (const j of fullJobs) log(`  full:    ${j.src} -> ${path.relative(ctx.root, j.out)}`);
  for (const j of imageJobs) log(`  image:   ${j.src} -> ${path.relative(ctx.root, j.out)}`);
  featureChanges.forEach((l) => log("  " + l));
  warnings.forEach((w) => log("  note: " + w));
  if (ctx.dryRun) return false;

  try {
    runMedia(ctx, previewJobs, imageJobs, fullJobs);
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
  if (!slug) throw new UserError("Usage: add-video <slug> [--youtube \"URL|title\"] [--full \"film.mp4|title\"] [--pending \"Title\"] [--preview file]");
  if (flags.agency !== undefined || flags.client !== undefined) throw new UserError("--agency / --client belong to a whole project: use them with add or add-case.");
  const data = load(ctx.root);
  const idx = findIndex(data.projects, slug);
  const project = data.projects[idx];
  const aspect = parseAspect(flags.aspect);
  const specs = (flags.youtube || []).map(parseYoutubeSpec);
  const fulls = flags.full || [];
  const pendings = flags.pending || [];
  if (!specs.length && !fulls.length && !pendings.length) throw new UserError('add-video needs --youtube "URL|title", --full "film.mp4|title" or --pending "Title".');
  const previews = flags.preview || [];
  previews.forEach((p) => ensureExists(p, "Preview source"));

  const existingIds = new Set(project.videos.map((v) => v.youtubeId).filter(Boolean));
  const taken = new Set(data.projects.flatMap((p) => [p.previewVideo, ...p.videos.flatMap((v) => [v.previewVideo, v.localVideo])]).filter(Boolean));
  const before = project.videos.length;
  const newVideos = specs.map((s, i) => {
    if (existingIds.has(s.youtubeId)) throw new UserError(`"${slug}" already has video ${s.youtubeId}.`);
    existingIds.add(s.youtubeId);
    return { title: s.title || `${project.title} ${before + i + 1}`, youtubeId: s.youtubeId, localVideo: "", previewVideo: "", ...(aspect ? { aspect } : {}) };
  });
  const extra = planExtraVideos(ctx, {
    slug, projectTitle: project.title, first: before + specs.length, total: before + specs.length + fulls.length + pendings.length + 1,
    full: fulls, pending: pendings, aspect, bump: true, taken,
  });
  for (const v of extra.videos) newVideos.push({ title: v.title, youtubeId: v.youtubeId, localVideo: v.localVideo, previewVideo: "", ...pick(v, ["hosting", "aspect", "durationSec", "pending"]) });
  if (previews.length > newVideos.length) throw new UserError(`${previews.length} previews but ${newVideos.length} new video(s).`);

  let n = before + 1;
  const previewJobs = [];
  previews.forEach((src, i) => {
    let url;
    do { url = `/videos/${slug}-${n++}-preview.mp4`; } while (taken.has(url) || fs.existsSync(toAbs(ctx, url)));
    taken.add(url);
    previewJobs.push({ src, out: toAbs(ctx, url) });
    newVideos[i].previewVideo = url;
  });

  log(ctx.dryRun ? "DRY RUN: nothing will be written.\n" : "");
  log(`Planned new video(s) for "${slug}":`);
  log(JSON.stringify(newVideos, null, 2));
  for (const j of previewJobs) log(`  preview: ${j.src} -> ${path.relative(ctx.root, j.out)} (+ posters)`);
  for (const j of extra.jobs) log(`  full:    ${j.src} -> ${path.relative(ctx.root, j.out)}`);
  extra.notes.forEach((w) => log("  note: " + w));
  if (!project.previewVideo && newVideos[0].previewVideo) log("  note: project had no previewVideo, using the first new one");
  if (ctx.dryRun) return false;

  try {
    runMedia(ctx, previewJobs, [], extra.jobs);
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

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

// ---------- set-youtube ----------
/** Video by 1-based number, else by exact title, else by unique title fragment (case-insensitive). */
function findVideo(project, ref) {
  const vids = project.videos || [];
  const s = String(ref).trim();
  if (/^\d+$/.test(s) && Number(s) >= 1 && Number(s) <= vids.length) return Number(s) - 1;
  const lc = s.toLowerCase();
  const exact = vids.map((v, i) => i).filter((i) => String(vids[i].title).toLowerCase() === lc);
  if (exact.length === 1) return exact[0];
  const part = vids.map((v, i) => i).filter((i) => String(vids[i].title).toLowerCase().includes(lc));
  if (part.length === 1) return part[0];
  const list = vids.map((v, i) => `    ${i + 1}. ${v.title}${isPending(v) ? " (pending)" : ""}`).join("\n");
  throw new UserError(`${part.length > 1 ? "More than one" : "No"} video of "${project.slug}" matches "${ref}". Its videos:\n${list || "    (none)"}`);
}

function cmdSetYoutube(ctx, slug, ref, url, flags) {
  if (!slug || !ref || !url) throw new UserError('Usage: set-youtube <slug> <n|title> <youtube-url>');
  const id = parseYoutubeId(url);
  const data = load(ctx.root);
  const project = data.projects[findIndex(data.projects, slug)];
  const vi = findVideo(project, ref);
  const v = project.videos[vi];
  if (project.videos.some((o, i) => i !== vi && o.youtubeId === id)) throw new UserError(`"${slug}" already uses ${id} on another video.`);
  if (v.youtubeId && v.youtubeId !== id && !ctx.force) throw new UserError(`Video ${vi + 1} of "${slug}" already has YouTube id ${v.youtubeId}. Pass --force to replace it.`);
  const wasPending = isPending(v);
  const next = { ...v, youtubeId: id };
  delete next.pending;
  project.videos[vi] = next;
  log(`${slug} video ${vi + 1} "${v.title}": youtubeId ${v.youtubeId || "(empty)"} -> ${id}${wasPending ? ", no longer pending" : ""}`);
  if (next.localVideo) log(`  localVideo kept: ${next.localVideo} (hosting: ${next.hosting || "not set"})`);
  const left = pendingCount(project);
  if (left) log(`  "${slug}" still has ${left} pending film(s).`);
  if (ctx.dryRun) { log("DRY RUN: nothing written."); return false; }
  save(ctx.root, data);
  return true;
}

// ---------- add-gallery ----------
/** One still -> WebP, long edge 1600: optimize-media's `image` command when it has one (falls back to ffmpeg if that fails), else embedded ffmpeg. */
function processGalleryImage(ctx, src, out, track) {
  const opt = findOptimizer(ctx.root);
  track(out);
  if (opt && opt.image) {
    try {
      runOptimizer(opt, ctx.root, ["image", path.resolve(src), out], `image ${path.basename(src)}`);
      if (fs.existsSync(out)) return;
    } catch (e) {
      log(`  note: ${e.message}; using the embedded ffmpeg instead`);
    }
  }
  convertImage(findFfmpeg(), src, out);
}

function cmdAddGallery(ctx, slug, flags) {
  if (!slug) throw new UserError('Usage: add-gallery <slug> --title "..." --image file.jpg [--image ...]');
  const title = String(flags.title || "").trim();
  if (!title) throw new UserError('add-gallery needs --title "Gallery title".');
  const srcs = flags.image || [];
  if (!srcs.length) throw new UserError("add-gallery needs at least one --image.");
  srcs.forEach((f) => ensureExists(f, "Image"));
  const data = load(ctx.root);
  const idx = findIndex(data.projects, slug);
  const project = data.projects[idx];
  const dir = ctx.pub("images", slug);

  // names already taken in /images/<slug>/
  const used = new Set(fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => f.replace(/\.[^.]+$/, "")) : []);
  const jobs = srcs.map((src) => {
    const name = sanitizeImageName(src, used);
    return { src, out: path.join(dir, name) };
  });

  const existing = (project.galleries || []).findIndex((g) => g.title.toLowerCase() === title.toLowerCase());
  log(ctx.dryRun ? "DRY RUN: nothing will be written.\n" : "");
  log(`${existing === -1 ? "New gallery" : "Adding to gallery"} "${title}" on "${slug}":`);
  for (const j of jobs) log(`  image: ${j.src} -> ${path.relative(ctx.root, j.out)}`);
  if (ctx.dryRun) return false;

  try {
    const track = (f) => ctx.created.push(f);
    const images = jobs.map((j) => {
      processGalleryImage(ctx, j.src, j.out, track);
      const info = probeMedia(findFfmpeg(), j.out);
      return { path: toPublicUrl(ctx, j.out), width: info.width, height: info.height };
    });
    const galleries = [...(project.galleries || [])];
    if (existing === -1) galleries.push({ title, images });
    else galleries[existing] = { ...galleries[existing], images: [...galleries[existing].images, ...images] };
    data.projects[idx] = setBefore(project, "galleries", galleries, "credits");
    save(ctx.root, data);
  } catch (e) {
    rollback(ctx);
    throw e;
  }
  log(`\nAdded ${jobs.length} image(s) to gallery "${title}" of "${slug}".`);
  return true;
}

// ---------- set-preview ----------
/** "name.mp4", "name", "/videos/name.mp4", "public/videos/name.mp4" or an absolute path under public/videos -> "/videos/name.mp4". */
function normalizePreviewUrl(ctx, input) {
  let s = String(input || "").trim();
  const vids = ctx.pub("videos");
  if (path.isAbsolute(s) && s.startsWith(vids + path.sep)) s = "/videos/" + path.relative(vids, s).split(path.sep).join("/");
  s = s.replace(/^(\.\/)?public\//, "/");
  if (!s.includes("/")) s = "/videos/" + s;
  if (!s.startsWith("/videos/") || s.includes("/posters/")) {
    throw new UserError(`"${input}" is not a clip under public/videos. Use a file name like hong-kong-cliff-preview.mp4.`);
  }
  if (!s.endsWith(".mp4")) s += ".mp4";
  return s;
}

function cmdSetPreview(ctx, slug, file, flags) {
  if (!slug || !file) throw new UserError("Usage: set-preview <slug> <existing-preview-file> [--force]");
  const data = load(ctx.root);
  const idx = findIndex(data.projects, slug);
  const project = data.projects[idx];
  const url = normalizePreviewUrl(ctx, file);
  if (!fs.existsSync(toAbs(ctx, url))) throw new UserError(`${url} does not exist under public/videos.`);
  const own = [...new Set((project.videos || []).map((v) => v.previewVideo).filter(Boolean))];
  if (!own.includes(url) && !ctx.force) {
    throw new UserError(
      `${url} is not one of the preview clips of "${slug}".\n` +
      (own.length ? `  Its clips: ${own.join(", ")}\n` : `  "${slug}" has no video previews of its own.\n`) +
      `  Pass --force to use a clip from anywhere in public/videos.`);
  }
  if (project.previewVideo === url) throw new UserError(`"${slug}" already uses ${url}.`);
  log(`previewVideo for ${slug}: ${project.previewVideo || "(none)"} -> ${url}`);
  const base = path.basename(url, ".mp4");
  for (const f of [`${base}.webp`, `${base}-tiny.webp`]) {
    if (!fs.existsSync(ctx.pub("videos", "posters", f))) log(`  note: public/videos/posters/${f} is missing: run "npm run media" to create it`);
  }
  if (!own.includes(url)) log("  note: --force used, the clip is not in this project's videos[]");
  if (project.featured == null) log(`  note: "${slug}" is not featured, so the homepage does not show this clip yet`);
  if (ctx.dryRun) { log("DRY RUN: nothing written."); return false; }
  data.projects[idx] = { ...project, previewVideo: url };
  save(ctx.root, data);
  return true;
}

// ---------- set-thumbnail ----------
/** Run fn; if it throws, restore the files that existed before and remove the ones it created. */
function withBackup(files, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "add-project-bak-"));
  const saved = files.map((f, i) => {
    if (!fs.existsSync(f)) return { f, bak: null };
    const bak = path.join(dir, String(i));
    fs.copyFileSync(f, bak);
    return { f, bak };
  });
  try { return fn(); }
  catch (e) {
    for (const { f, bak } of saved) { if (bak) fs.copyFileSync(bak, f); else fs.rmSync(f, { force: true }); }
    throw e;
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

/** --y 0..1: vertical crop anchor for thumbnails (0 = top, 1 = bottom, default 0.5). */
function parseY(flags) {
  if (flags.y === undefined) return undefined;
  const y = Number(flags.y);
  if (!(y >= 0 && y <= 1)) throw new UserError("--y must be a number from 0 (top) to 1 (bottom).");
  return y;
}

function cmdSetThumbnail(ctx, slug, image, flags) {
  if (!slug || !image) throw new UserError("Usage: set-thumbnail <slug> <image> [--y 0..1]");
  ensureExists(image, "Image");
  const y = parseY(flags);
  const data = load(ctx.root);
  const idx = findIndex(data.projects, slug);
  const big = ctx.pub("images", "thumbs", `${slug}.webp`);
  const had = fs.existsSync(big);
  const url = toPublicUrl(ctx, big);
  log(`thumbnail for ${slug}: ${data.projects[idx].thumbnail || "(none)"} -> ${url}${had ? " (replaces the existing file)" : ""}`);
  log(`  image: ${image} -> ${path.relative(ctx.root, big)} (2.39:1, 1280x536, + -tiny.webp)`);
  if (ctx.dryRun) { log("DRY RUN: nothing written."); return false; }
  withBackup([big, ctx.pub("images", "thumbs", `${slug}-tiny.webp`)], () => {
    makeThumb(ctx, image, slug, y);
    data.projects[idx] = setField(data.projects[idx], "thumbnail", url);
    save(ctx.root, data);
  });
  return true;
}

// ---------- add-case ----------
function cmdAddCase(ctx, flags) {
  const o = collectAddOptions(flags);
  const y = parseY(flags);
  const data = load(ctx.root);
  const { projects } = data;
  validateSlug(o.slug);
  if (projects.some((p) => p.slug === o.slug)) throw new UserError(`Slug "${o.slug}" already exists in projects.json.`);
  const missing = ["title", "tag", "year", "description", "thumbnail"].filter((k) => !o[k] || !String(o[k]).trim());
  if (missing.length) throw new UserError(`Missing required: ${missing.map((m) => "--" + m).join(", ")}`);
  if (!/^\d{4}(\s*[–-]\s*\d{2,4})?$/.test(String(o.year))) throw new UserError(`--year must look like 2025 or 2024–25, got "${o.year}"`);
  if (o.category && o.category !== "other") throw new UserError('add-case always creates category "other"; use "add" for film/travel projects.');
  if (o.youtube.length || o.preview.length || o.image.length || o.full.length || o.pending.length || o.featured !== undefined) {
    throw new UserError("add-case takes no --youtube/--full/--pending/--preview/--image/--featured: case studies have a thumbnail and a custom page, not a clip.");
  }

  // thumbnail: an image to convert, or a thumbs URL that is already in public/
  const existingUrl = /^\/images\/thumbs\/[^/]+\.webp$/.test(o.thumbnail) && fs.existsSync(toAbs(ctx, o.thumbnail));
  let thumbJob = null;
  if (existingUrl) {
    // use as is
  } else {
    ensureExists(o.thumbnail, "Thumbnail image");
    thumbJob = { src: o.thumbnail, out: ctx.pub("images", "thumbs", `${o.slug}.webp`) };
    checkTargets(ctx, [thumbJob.out]);
  }
  const thumbUrl = existingUrl ? o.thumbnail : toPublicUrl(ctx, thumbJob.out);
  const entry = buildCaseEntry(o, thumbUrl);
  const index = insertionIndex(projects, "other", o.position);
  const next = [...projects];
  next.splice(index, 0, entry);
  const pageExists = fs.existsSync(path.join(ctx.root, "app", "work", o.slug, "page.tsx"));

  log(ctx.dryRun ? "DRY RUN: nothing will be written.\n" : "");
  log(`Planned case study "${o.slug}" (position ${index + 1} of ${next.length} in projects.json):`);
  log(JSON.stringify(entry, null, 2));
  if (thumbJob) log(`  thumbnail: ${thumbJob.src} -> ${path.relative(ctx.root, thumbJob.out)} (2.39:1, + -tiny.webp)`);
  if (!o.location) log("  note: no --location");
  if (!o.short) log("  note: --short not given: used the first sentence of the description");
  if (ctx.dryRun) { caseReminder(o.slug, pageExists); return false; }

  try {
    if (thumbJob) makeThumb(ctx, thumbJob.src, o.slug, y);
    data.projects = next;
    save(ctx.root, data);
  } catch (e) {
    rollback(ctx);
    throw e;
  }
  log(`\nAdded case study "${o.slug}".`);
  caseReminder(o.slug, pageExists);
  return true;
}

function caseReminder(slug, pageExists) {
  if (pageExists) { log(`\nThe custom page app/work/${slug}/page.tsx already exists: check its content matches the entry.`); return; }
  log(`
REMINDER: the entry only fills the index. The page itself is still to be built: app/work/${slug}/page.tsx.
Until it exists the card opens the generic project page, which is made for videos. Copy a template:
  cd "<repo>"
  mkdir -p app/work/${slug}
  cp app/work/halatia/page.tsx app/work/${slug}/page.tsx            # brand identity
  cp app/work/b1nbags-process/page.tsx app/work/${slug}/page.tsx    # process / slides (use one of the two)
Then put images in public/images/${slug}/ (hyphens, no spaces), list them in data/${slug}-images.json
(no fs.readdirSync), edit the copy, and run "npm run media" to optimise. See docs/CONTENT.md.`);
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
    p.previewVideo, p.coverImage, p.thumbnail, p.bannerImage, p.instagramGridImage, p.mascotImage, p.campaignDesignImage,
    ...(p.videos || []).flatMap((v) => [v.previewVideo, v.localVideo]),
    ...((p.photoGrid && p.photoGrid.images) || []),
    ...(p.galleries || []).flatMap((g) => (g.images || []).map((i) => (typeof i === "string" ? i : i.path))),
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
    if (u.startsWith("/images/thumbs/") && u.endsWith(".webp") && !u.endsWith("-tiny.webp")) files.add(toAbs(ctx, u.replace(/\.webp$/, "-tiny.webp")));
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
  const known = new Set(["add", "add-case", "add-video", "set-youtube", "add-gallery", "set-preview", "set-thumbnail", "feature", "unfeature", "hide", "unhide", "move", "remove", "list", "help"]);
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
    case "add-case": changed = cmdAddCase(ctx, flags); break;
    case "set-preview": changed = cmdSetPreview(ctx, args[0], args[1], flags); break;
    case "set-thumbnail": changed = cmdSetThumbnail(ctx, args[0], args[1], flags); break;
    case "add-video": changed = cmdAddVideo(ctx, args[0], flags); break;
    case "set-youtube": changed = cmdSetYoutube(ctx, args[0], args[1], args[2], flags); break;
    case "add-gallery": changed = cmdAddGallery(ctx, args[0], flags); break;
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
    case "list": {
      const ps = load(ctx.root).projects;
      log(formatTable(listRows(ps)));
      const pending = ps.reduce((n, p) => n + pendingCount(p), 0);
      if (pending) log(`\n${pending} film(s) waiting for a YouTube upload. Fill with: set-youtube <slug> <n|title> <url>`);
      return;
    }
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
