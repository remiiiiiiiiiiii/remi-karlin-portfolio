#!/usr/bin/env node
// pick-frames: propose candidate stills for a project's landing banner, then apply the one Rémi picks.
//
//   node scripts/pick-frames.mjs sheet [slug ...] [--count 6] [--samples 36] [--previews] [--y 0..1]
//       Samples frames across the project's films (full local files when present, else the preview
//       clips), scores them (exposure, contrast, sharpness), keeps the best frame in each of
//       --count time buckets and writes a numbered contact sheet to .frames/<slug>/sheet.jpg
//       showing each candidate at the 2.39:1 banner crop. No slug = every featured project.
//
//   node scripts/pick-frames.mjs apply <slug> <n> [<slug> <n> ...] [--y 0..1] [--dry-run]
//       Re-extracts candidate n at full quality and writes both landing banners:
//         public/images/thumbs/<slug>.webp       2.39:1 (work index)   -> "thumbnail"
//         public/images/thumbs/<slug>-16x9.webp  16:9  (phone grid)    -> "poster"
//       plus their -tiny.webp blur-ups. --y moves the crop (0 top, 0.5 centre, 1 bottom).
//
//   node scripts/pick-frames.mjs apply <slug> --source <video|image> --at <seconds> [--y 0..1]
//       Same, for a frame that was not on the sheet.
//
// Candidates live in .frames/ (git-ignored). The desktop hero is untouched: it plays the clips.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs, UserError } from "./lib/args.mjs";
import { load, save } from "./lib/store.mjs";
import { findFfmpeg, probeMedia } from "./lib/media.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FONT = "/System/Library/Fonts/Helvetica.ttc";
const THUMB = { w: 1280, h: 536 };   // 2.39:1, same as add-project set-thumbnail
const POSTER = { w: 1280, h: 720 };  // 16:9, phone grid
const TILE_W = 640;
const TILE_H = Math.round(TILE_W / 2.39);
const GAP = 8;

const log = (...a) => console.log(...a);

function ctxFrom(flags) {
  const root = path.resolve(flags.root || path.join(HERE, ".."));
  return {
    root,
    pub: (...p) => path.join(root, "public", ...p),
    framesDir: path.join(root, ".frames"),
    ffmpeg: findFfmpeg(),
    dryRun: !!flags["dry-run"],
    y: parseY(flags),
  };
}

function parseY(flags) {
  if (flags.y === undefined) return undefined;
  const y = Number(flags.y);
  if (!Number.isFinite(y) || y < 0 || y > 1) throw new UserError("--y must be a number between 0 and 1.");
  return y;
}

function ff(ctx, args, what) {
  const r = spawnSync(ctx.ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], { encoding: "utf8" });
  if (r.status !== 0) throw new UserError(`ffmpeg failed (${what}): ${(r.stderr || "").trim().split("\n").slice(-3).join(" | ")}`);
}

function ffAsync(ctx, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ctx.ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args]);
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(err.trim().split("\n").slice(-2).join(" | ")))));
  });
}

/** Public URL ("/videos/x.mp4") -> absolute file path, or null when the file is not on disk. */
function onDisk(ctx, url) {
  if (!url) return null;
  const f = ctx.pub(...url.replace(/^\//, "").split("/"));
  return fs.existsSync(f) ? f : null;
}

/** Hero clips the way lib/projects.ts derives them: explicit heroClips, else previewVideo first then non-vertical clips. */
function heroClips(p) {
  if (p.heroClips && p.heroClips.length) return [...new Set(p.heroClips)];
  const all = [...new Set([p.previewVideo, ...p.videos.map((v) => v.previewVideo)].filter(Boolean))];
  return all.filter((src, i) => {
    if (i === 0) return true;
    const a = p.videos.find((v) => v.previewVideo === src)?.aspect;
    return a !== "9:16" && a !== "4:5";
  });
}

/**
 * Where to sample frames for a project: for each hero clip, the full film it was cut from when that
 * file is on disk (the video entry's localVideo, else /videos/<name>.mp4 next to the preview), else the
 * preview clip itself. --previews forces the clips (8 s each, what the hero actually plays).
 */
function sourcesFor(ctx, data, p, previewsOnly) {
  const out = [];
  for (const clip of heroClips(p)) {
    const entries = data.projects.flatMap((q) => q.videos).filter((v) => v.previewVideo === clip);
    const local = entries.map((v) => onDisk(ctx, v.localVideo)).find(Boolean);
    const full = previewsOnly ? null : local || onDisk(ctx, clip.replace(/-preview\.mp4$/, ".mp4"));
    const file = full || onDisk(ctx, clip);
    if (!file) { log(`  (skip ${clip}: not on disk)`); continue; }
    if (!out.some((s) => s.file === file)) out.push({ file, url: full ? null : clip, label: path.basename(file) });
  }
  if (!out.length) throw new UserError(`${p.slug}: no clip or film on disk to sample from.`);
  return out;
}

/** Spread `total` sample times evenly over the sources (each film gets the same share), at least 4 per source. */
function samplePlan(ctx, sources, total) {
  for (const s of sources) s.duration = probeMedia(ctx.ffmpeg, s.file).duration || 8;
  const plan = [];
  sources.forEach((s, si) => {
    const n = Math.max(4, Math.round(total / sources.length));
    const start = Math.min(0.5, s.duration * 0.02), end = s.duration * 0.97;
    for (let k = 0; k < n; k++) plan.push({ si, at: +(start + ((k + 0.5) / n) * (end - start)).toFixed(2) });
  });
  return plan;
}

/** Exposure / contrast / sharpness score of a tiny greyscale frame; dark, blown-out and flat frames sink. */
function score(gray, w) {
  const n = gray.length;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += gray[i];
  const mean = sum / n;
  let varSum = 0, edge = 0, edges = 0;
  for (let i = 0; i < n; i++) {
    varSum += (gray[i] - mean) ** 2;
    if ((i + 1) % w !== 0) { edge += Math.abs(gray[i] - gray[i + 1]); edges++; }
  }
  const std = Math.sqrt(varSum / n), sharp = edge / Math.max(1, edges);
  let s = std + 2 * sharp;
  if (mean < 28) s *= 0.3;
  if (mean > 228) s *= 0.4;
  if (std < 12) s *= 0.2;
  return { mean: +mean.toFixed(1), std: +std.toFixed(1), sharp: +sharp.toFixed(1), score: +s.toFixed(1) };
}

async function pool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) { const i = next++; results[i] = await fn(items[i], i); }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function meanAbsDiff(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]);
  return d / a.length;
}

async function makeSheet(ctx, data, p, opts) {
  const sources = sourcesFor(ctx, data, p, opts.previews);
  const plan = samplePlan(ctx, sources, opts.samples);
  const dir = path.join(ctx.framesDir, p.slug);
  const tmp = path.join(dir, "samples");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  log(`${p.slug}: ${sources.map((s) => `${s.label} (${Math.round(s.duration)} s)`).join(", ")} -> ${plan.length} samples`);

  const SM_W = 48;
  const samples = await pool(plan, 4, async (pt, i) => {
    const src = sources[pt.si];
    const big = path.join(tmp, `${i}.jpg`), sm = path.join(tmp, `${i}.gray`);
    await ffAsync(ctx, ["-ss", String(pt.at), "-i", src.file,
      "-filter_complex", `[0:v]split=2[a][b];[a]scale=${TILE_W}:-2:flags=bicubic[big];[b]scale=${SM_W}:-2:flags=area,format=gray[sm]`,
      "-map", "[big]", "-frames:v", "1", "-q:v", "3", big,
      "-map", "[sm]", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", sm]);
    const gray = fs.readFileSync(sm);
    return { i, si: pt.si, at: pt.at, big, gray, ...score(gray, SM_W) };
  });

  // Best frame per time bucket, skipping near-duplicates of an earlier pick.
  const count = Math.min(opts.count, samples.length);
  const chosen = [];
  for (let b = 0; b < count; b++) {
    const lo = Math.floor((b * samples.length) / count), hi = Math.floor(((b + 1) * samples.length) / count);
    const bucket = samples.slice(lo, hi).sort((x, y) => y.score - x.score);
    const pick = bucket.find((s) => !chosen.some((c) => meanAbsDiff(c.gray, s.gray) < 14)) || bucket[0];
    if (pick) chosen.push(pick);
  }

  const y = ctx.y ?? 0.5;
  const candidates = chosen.map((c, k) => {
    const n = k + 1;
    const keep = path.join(dir, `${n}.jpg`);
    fs.copyFileSync(c.big, keep);
    const src = sources[c.si];
    return { n, source: src.url || path.relative(ctx.root, src.file), at: c.at, score: c.score, mean: c.mean };
  });
  fs.rmSync(tmp, { recursive: true, force: true });

  // Contact sheet: each candidate at the 2.39:1 crop, numbered, 2 columns, title bar.
  const cols = candidates.length > 6 ? 3 : 2;
  const rows = Math.ceil(candidates.length / cols);
  const tw = TILE_W + GAP * 2, th = TILE_H + GAP * 2;
  const inputs = candidates.flatMap((c) => ["-i", path.join(dir, `${c.n}.jpg`)]);
  const tiles = candidates.map((c, k) =>
    `[${k}:v]scale=${TILE_W}:${TILE_H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${TILE_W}:${TILE_H}:(iw-${TILE_W})/2:(ih-${TILE_H})*${y},` +
    `pad=${tw}:${th}:${GAP}:${GAP}:color=#111111,` +
    `drawtext=fontfile=${FONT}:text='${c.n}':fontsize=30:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=10:x=${GAP + 14}:y=${GAP + 12}[t${k}]`);
  const layout = candidates.map((_, k) => `${(k % cols) * tw}_${Math.floor(k / cols) * th}`).join("|");
  const title = `${p.title}   ·   ${candidates.length} frames, 2.39:1 banner crop   ·   apply: pick-frames apply ${p.slug} N`.replace(/[':\\]/g, (m) => "\\" + m);
  const stack = candidates.length === 1 ? `[t0]copy[grid]` : `${candidates.map((_, k) => `[t${k}]`).join("")}xstack=inputs=${candidates.length}:layout=${layout}:fill=#111111[grid]`;
  const fc = `${tiles.join(";")};${stack};[grid]pad=iw:ih+52:0:52:color=#111111,drawtext=fontfile=${FONT}:text='${title}':fontsize=22:fontcolor=white:x=${GAP + 4}:y=16[out]`;
  const sheet = path.join(dir, "sheet.jpg");
  ff(ctx, [...inputs, "-filter_complex", fc, "-map", "[out]", "-frames:v", "1", "-q:v", "4", sheet], `sheet ${p.slug}`);

  const manifest = { slug: p.slug, title: p.title, y, generatedAt: new Date().toISOString(), candidates };
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  log(`  -> ${path.relative(ctx.root, sheet)}  (${candidates.map((c) => `${c.n}: ${path.basename(c.source)} @ ${c.at}s`).join(", ")})`);
  return sheet;
}

function cmdSheet(ctx, positionals, flags) {
  const data = load(ctx.root);
  const slugs = positionals.length
    ? positionals
    : data.projects.filter((p) => typeof p.featured === "number" && !p.hidden).sort((a, b) => a.featured - b.featured).map((p) => p.slug);
  const opts = { count: Number(flags.count || 6), samples: Number(flags.samples || 36), previews: !!flags.previews };
  if (!(opts.count >= 1 && opts.count <= 12)) throw new UserError("--count must be between 1 and 12.");
  if (!(opts.samples >= opts.count)) throw new UserError("--samples must be at least --count.");
  return (async () => {
    const sheets = [];
    for (const slug of slugs) {
      const p = data.projects.find((q) => q.slug === slug);
      if (!p) throw new UserError(`No project with slug "${slug}".`);
      sheets.push(await makeSheet(ctx, data, p, opts));
    }
    log(`\n${sheets.length} sheet(s) in ${path.relative(ctx.root, ctx.framesDir)}/<slug>/sheet.jpg`);
  })();
}

/** Full-quality still at `at` seconds of `source` (a video, or an image when `at` is undefined). */
function extractFrame(ctx, source, at, out) {
  const args = at === undefined ? ["-i", source] : ["-ss", String(at), "-i", source];
  ff(ctx, [...args, "-frames:v", "1", "-c:v", "png", out], `frame ${path.basename(source)}`);
}

function writeStill(ctx, png, slug, suffix, { w, h }, y) {
  const dir = ctx.pub("images", "thumbs");
  fs.mkdirSync(dir, { recursive: true });
  const big = path.join(dir, `${slug}${suffix}.webp`), tiny = path.join(dir, `${slug}${suffix}-tiny.webp`);
  const fill = `scale=${w}:${h}:force_original_aspect_ratio=increase:flags=lanczos,crop=${w}:${h}:(iw-${w})/2:(ih-${h})*${y}`;
  const q = ["-c:v", "libwebp", "-quality", "80", "-compression_level", "6"];
  ff(ctx, ["-i", png, "-frames:v", "1", "-vf", fill, ...q, big], `still ${slug}${suffix}`);
  ff(ctx, ["-i", big, "-frames:v", "1", "-vf", "scale=24:-2:flags=lanczos", ...q, tiny], `tiny ${slug}${suffix}`);
  return `/images/thumbs/${slug}${suffix}.webp`;
}

function resolveSource(ctx, url) {
  if (url.startsWith("/")) { const f = onDisk(ctx, url); if (!f) throw new UserError(`${url} is not on disk any more.`); return f; }
  const f = path.resolve(ctx.root, url);
  if (!fs.existsSync(f)) throw new UserError(`${url} is not on disk any more.`);
  return f;
}

function cmdApply(ctx, positionals, flags) {
  const data = load(ctx.root);
  const jobs = [];
  if (flags.source) {
    if (positionals.length !== 1) throw new UserError("Usage: apply <slug> --source <video|image> --at <seconds>");
    const source = path.resolve(flags.source);
    if (!fs.existsSync(source)) throw new UserError(`Source not found: ${source}`);
    const at = flags.at === undefined ? undefined : Number(flags.at);
    if (flags.at !== undefined && !(at >= 0)) throw new UserError("--at must be a number of seconds.");
    jobs.push({ slug: positionals[0], source, at, label: `${path.basename(source)}${at === undefined ? "" : ` @ ${at}s`}`, y: ctx.y ?? 0.5 });
  } else {
    if (!positionals.length || positionals.length % 2) throw new UserError("Usage: apply <slug> <n> [<slug> <n> ...]  (n = number on the sheet)");
    for (let i = 0; i < positionals.length; i += 2) {
      const slug = positionals[i], n = Number(positionals[i + 1]);
      const mf = path.join(ctx.framesDir, slug, "manifest.json");
      if (!fs.existsSync(mf)) throw new UserError(`No sheet for ${slug}. Run: pick-frames sheet ${slug}`);
      const m = JSON.parse(fs.readFileSync(mf, "utf8"));
      const c = m.candidates.find((x) => x.n === n);
      if (!c) throw new UserError(`${slug}: the sheet has frames 1 to ${m.candidates.length}, not ${positionals[i + 1]}.`);
      jobs.push({ slug, source: resolveSource(ctx, c.source), at: c.at, label: `frame ${n} (${path.basename(c.source)} @ ${c.at}s)`, y: ctx.y ?? m.y ?? 0.5 });
    }
  }
  for (const j of jobs) if (!data.projects.some((p) => p.slug === j.slug)) throw new UserError(`No project with slug "${j.slug}".`);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pick-frames-"));
  try {
    for (const j of jobs) {
      const idx = data.projects.findIndex((p) => p.slug === j.slug);
      const p = data.projects[idx];
      log(`${j.slug}: ${j.label}, crop y=${j.y}`);
      log(`  thumbnail ${p.thumbnail || "(none)"} -> /images/thumbs/${j.slug}.webp`);
      log(`  poster    ${p.poster || "(clip poster)"} -> /images/thumbs/${j.slug}-16x9.webp`);
      if (ctx.dryRun) continue;
      const png = path.join(tmp, `${j.slug}.png`);
      extractFrame(ctx, j.source, j.at, png);
      const thumbnail = writeStill(ctx, png, j.slug, "", THUMB, j.y);
      const poster = writeStill(ctx, png, j.slug, "-16x9", POSTER, j.y);
      // Keep key order stable: thumbnail/poster next to previewVideo when new.
      const next = {};
      for (const [k, v] of Object.entries(p)) {
        next[k] = v;
        if (k === "coverImage") { next.thumbnail = thumbnail; next.poster = poster; }
      }
      if (!("coverImage" in p)) { next.thumbnail = thumbnail; next.poster = poster; }
      data.projects[idx] = next;
    }
    if (ctx.dryRun) { log("DRY RUN: nothing written."); return; }
    save(ctx.root, data);
    log(`\nWritten. Check the index and phone grid, then: git add data public && git commit -m "Banners: ${jobs.map((j) => j.slug).join(", ")}"`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const USAGE = `pick-frames: choose landing banners from real frames.
  sheet [slug ...] [--count 6] [--samples 36] [--previews] [--y 0..1]   contact sheets in .frames/<slug>/sheet.jpg
  apply <slug> <n> [<slug> <n> ...] [--y 0..1] [--dry-run]              write the chosen frame as thumbnail + poster
  apply <slug> --source <file> --at <seconds> [--y 0..1]                 any other frame`;

async function main() {
  const argv = process.argv.slice(2);
  const previews = argv.includes("--previews");
  const { flags, positionals } = parseArgs(argv.filter((a) => a !== "--previews"));
  if (previews) flags.previews = true;
  const [cmd, ...rest] = positionals;
  const ctx = ctxFrom(flags);
  if (cmd === "sheet") return cmdSheet(ctx, rest, flags);
  if (cmd === "apply") return cmdApply(ctx, rest, flags);
  console.log(USAGE);
  process.exit(cmd ? 2 : 0);
}

main().catch((e) => {
  console.error(e instanceof UserError ? e.message : e);
  process.exit(1);
});
