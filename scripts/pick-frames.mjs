#!/usr/bin/env node
// pick-frames: propose candidate stills for a project's landing banner, then apply the one Rémi picks.
//
//   node scripts/pick-frames.mjs sheet [slug ...] [--count 20] [--per-film 80] [--scene 0.3] [--previews] [--y 0..1]
//       Finds the shots of the project's films (full local files when present, else the preview
//       clips), takes one candidate frame per shot (away from the cuts), scores them for exposure,
//       contrast, sharpness and colour, drops near-duplicates, keeps the best --count spread over the
//       films and writes a numbered contact sheet to .frames/<slug>/sheet.jpg showing each at the
//       2.39:1 banner crop. No slug = every featured project.
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

/**
 * Shot boundaries of a film: ffmpeg's scene-change score on a 320 px copy. Returns the shots as
 * [start, end] pairs covering the whole duration. A film with no detectable cuts is one shot.
 */
function detectShots(ctx, file, duration, threshold) {
  const r = spawnSync(ctx.ffmpeg, ["-hide_banner", "-loglevel", "info", "-threads", "8", "-i", file, "-an",
    "-vf", `scale=320:-2,select='gt(scene,${threshold})',showinfo`, "-f", "null", "-"], { encoding: "utf8", maxBuffer: 64 << 20 });
  const cuts = [...(r.stderr || "").matchAll(/pts_time:\s*([\d.]+)/g)].map((m) => Number(m[1])).filter((t) => t > 0.2 && t < duration - 0.2);
  cuts.sort((a, b) => a - b);
  const shots = [];
  let prev = 0;
  for (const c of cuts) { if (c - prev >= 0.3) { shots.push([prev, c]); prev = c; } }
  shots.push([prev, duration]);
  return shots;
}

/**
 * Candidate times for one film: the middle of every shot (never within 0.3 s of a cut, where fades
 * and motion blur live), plus one more point every ~5 s inside long takes. Capped at `max` points,
 * thinned evenly over time when there are more shots than that.
 */
function candidateTimes(shots, max) {
  const pts = [];
  for (const [a, b] of shots) {
    const len = b - a;
    if (len < 0.2) continue;
    const edge = Math.min(0.3, len * 0.3);
    const lo = a + edge, hi = b - edge;
    if (hi - lo < 1) { pts.push(+((a + b) / 2).toFixed(2)); continue; }
    const n = Math.max(1, Math.round((hi - lo) / 5));
    for (let k = 0; k < n; k++) pts.push(+(lo + ((k + 0.5) / n) * (hi - lo)).toFixed(2));
  }
  if (pts.length <= max) return pts;
  return Array.from({ length: max }, (_, k) => pts[Math.floor(((k + 0.5) / max) * pts.length)]);
}

/** Difference hash (9x8 gradients -> 64 bits) of a small greyscale frame; near-duplicates land within a few bits. */
function dHash(gray, w, h) {
  const bits = [];
  for (let y = 0; y < 8; y++) {
    const sy0 = Math.floor((y * h) / 8), sy1 = Math.max(sy0 + 1, Math.floor(((y + 1) * h) / 8));
    const row = [];
    for (let x = 0; x < 9; x++) {
      const sx0 = Math.floor((x * w) / 9), sx1 = Math.max(sx0 + 1, Math.floor(((x + 1) * w) / 9));
      let sum = 0, n = 0;
      for (let yy = sy0; yy < sy1; yy++) for (let xx = sx0; xx < sx1; xx++) { sum += gray[yy * w + xx]; n++; }
      row.push(sum / n);
    }
    for (let x = 0; x < 8; x++) bits.push(row[x] < row[x + 1] ? 1 : 0);
  }
  return bits;
}
const hamming = (a, b) => a.reduce((d, bit, i) => d + (bit !== b[i] ? 1 : 0), 0);
function meanAbsDiff(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]);
  return d / a.length;
}
/** Two frames are "the same picture" when their hashes nearly agree or the pixels barely differ. */
const similar = (x, y) => hamming(x.hash, y.hash) <= 5 || meanAbsDiff(x.gray, y.gray) < 7;

/**
 * Quality score of a frame. Exposure and contrast from the 48 px grey, sharpness as the Laplacian
 * variance of the 160 px grey (motion blur and soft focus sink), colourfulness from a 24 px RGB.
 * Very dark, blown-out and flat frames are penalised hard.
 */
function score(gray, w, big, bw, bh, rgb) {
  const n = gray.length;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += gray[i];
  const mean = sum / n;
  let varSum = 0;
  for (let i = 0; i < n; i++) varSum += (gray[i] - mean) ** 2;
  const std = Math.sqrt(varSum / n);
  let lapSum = 0, lapSq = 0, cnt = 0;
  for (let y = 1; y < bh - 1; y++) for (let x = 1; x < bw - 1; x++) {
    const i = y * bw + x;
    const l = 4 * big[i] - big[i - 1] - big[i + 1] - big[i - bw] - big[i + bw];
    lapSum += l; lapSq += l * l; cnt++;
  }
  const lapMean = lapSum / cnt, sharp = lapSq / cnt - lapMean * lapMean;
  let rg = [], yb = [];
  for (let i = 0; i + 2 < rgb.length; i += 3) { rg.push(rgb[i] - rgb[i + 1]); yb.push(0.5 * (rgb[i] + rgb[i + 1]) - rgb[i + 2]); }
  const m = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const sd = (a) => { const mm = m(a); return Math.sqrt(m(a.map((v) => (v - mm) ** 2))); };
  const colour = Math.sqrt(sd(rg) ** 2 + sd(yb) ** 2) + 0.3 * Math.sqrt(m(rg) ** 2 + m(yb) ** 2);
  let s = Math.min(std, 60) / 60 + 1.4 * Math.min(sharp, 800) / 800 + 0.5 * Math.min(colour, 50) / 50;
  if (mean < 30) s *= 0.3;
  if (mean > 225) s *= 0.4;
  if (std < 14) s *= 0.3;
  return { mean: +mean.toFixed(1), std: +std.toFixed(1), sharp: +sharp.toFixed(0), colour: +colour.toFixed(1), score: +s.toFixed(3) };
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

async function makeSheet(ctx, data, p, opts) {
  const sources = sourcesFor(ctx, data, p, opts.previews);
  const dir = path.join(ctx.framesDir, p.slug);
  const tmp = path.join(dir, "samples");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });

  // 1. Shots per film -> candidate times.
  const plan = [];
  sources.forEach((s, si) => {
    s.duration = probeMedia(ctx.ffmpeg, s.file).duration || 8;
    s.shots = detectShots(ctx, s.file, s.duration, opts.scene);
    const times = candidateTimes(s.shots, opts.perFilm);
    s.candidates = times.length;
    for (const at of times) plan.push({ si, at });
  });
  log(`${p.slug}: ${sources.map((s) => `${s.label} (${Math.round(s.duration)} s, ${s.shots.length} shots, ${s.candidates} candidates)`).join(", ")}`);

  // 2. One ffmpeg call per candidate: 640 px jpeg for the sheet + three tiny rasters for scoring.
  const SM_W = 48, BIG_W = 160, RGB_W = 24;
  const samples = await pool(plan, 4, async (pt, i) => {
    const src = sources[pt.si];
    const big = path.join(tmp, `${i}.jpg`), sm = path.join(tmp, `${i}.gray`), lg = path.join(tmp, `${i}.lgray`), rgb = path.join(tmp, `${i}.rgb`);
    await ffAsync(ctx, ["-ss", String(pt.at), "-i", src.file,
      "-filter_complex", `[0:v]split=4[a][b][c][d];[a]scale=${TILE_W}:-2:flags=bicubic[big];[b]scale=${SM_W}:-2:flags=area,format=gray[sm];[c]scale=${BIG_W}:-2:flags=area,format=gray[lg];[d]scale=${RGB_W}:-2:flags=area,format=rgb24[rgb]`,
      "-map", "[big]", "-frames:v", "1", "-q:v", "3", big,
      "-map", "[sm]", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", sm,
      "-map", "[lg]", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", lg,
      "-map", "[rgb]", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", rgb]);
    const gray = fs.readFileSync(sm), lgray = fs.readFileSync(lg), rgbBuf = fs.readFileSync(rgb);
    const smH = gray.length / SM_W, lgH = lgray.length / BIG_W;
    return { i, si: pt.si, at: pt.at, big, gray, hash: dHash(gray, SM_W, smH), ...score(gray, SM_W, lgray, BIG_W, lgH, rgbBuf) };
  });

  // 3. Pick: each film gets a share of the count (more shots, more frames; at least 2), best scores
  //    first, never a near-duplicate of an earlier pick, never two from the same second. Leftover
  //    slots go to the best remaining frames of any film.
  const count = Math.min(opts.count, samples.length);
  const bySource = sources.map((_, si) => samples.filter((s) => s.si === si).sort((a, b) => b.score - a.score));
  const weights = sources.map((s) => Math.sqrt(Math.max(1, s.shots.length)));
  const wsum = weights.reduce((a, b) => a + b, 0);
  const quota = sources.map((s, si) => Math.min(bySource[si].length, Math.max(bySource[si].length ? Math.min(2, bySource[si].length) : 0, Math.round((count * weights[si]) / wsum))));
  const chosen = [];
  const ok = (s) => !chosen.some((c) => similar(c, s) || (c.si === s.si && Math.abs(c.at - s.at) < 0.8));
  for (let si = 0; si < sources.length; si++) {
    let taken = 0;
    for (const s of bySource[si]) { if (taken >= quota[si]) break; if (ok(s)) { chosen.push(s); taken++; } }
  }
  if (chosen.length < count) {
    for (const s of [...samples].sort((a, b) => b.score - a.score)) { if (chosen.length >= count) break; if (!chosen.includes(s) && ok(s)) chosen.push(s); }
  }
  chosen.sort((a, b) => a.si - b.si || a.at - b.at);

  const y = ctx.y ?? 0.5;
  const candidates = chosen.map((c, k) => {
    const n = k + 1;
    fs.copyFileSync(c.big, path.join(dir, `${n}.jpg`));
    const src = sources[c.si];
    return { n, source: src.url || path.relative(ctx.root, src.file), film: src.label.replace(/\.(mp4|mov)$/i, "").replace(/-preview$/, ""), at: c.at, score: c.score, sharp: c.sharp, mean: c.mean };
  });
  fs.rmSync(tmp, { recursive: true, force: true });

  // 4. Contact sheet: every candidate at the 2.39:1 banner crop, numbered, film name bottom-left.
  const cols = candidates.length > 12 ? 4 : candidates.length > 6 ? 3 : 2;
  const tileW = cols === 4 ? 480 : TILE_W, tileH = Math.round(tileW / 2.39);
  const tw = tileW + GAP * 2, th = tileH + GAP * 2;
  const esc = (t) => String(t).replace(/[\\':%,\[\]]/g, (m) => "\\" + m);
  const inputs = candidates.flatMap((c) => ["-i", path.join(dir, `${c.n}.jpg`)]);
  const tiles = candidates.map((c, k) =>
    `[${k}:v]scale=${tileW}:${tileH}:force_original_aspect_ratio=increase:flags=lanczos,crop=${tileW}:${tileH}:(iw-${tileW})/2:(ih-${tileH})*${y},` +
    `pad=${tw}:${th}:${GAP}:${GAP}:color=#111111,` +
    `drawtext=fontfile=${FONT}:text='${c.n}':fontsize=26:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=8:x=${GAP + 12}:y=${GAP + 10},` +
    `drawtext=fontfile=${FONT}:text='${esc(c.film)}  ${c.at}s':fontsize=12:fontcolor=white@0.85:box=1:boxcolor=black@0.45:boxborderw=5:x=${GAP + 10}:y=h-th-${GAP + 10}[t${k}]`);
  const layout = candidates.map((_, k) => `${(k % cols) * tw}_${Math.floor(k / cols) * th}`).join("|");
  const title = esc(`${p.title}   ·   ${candidates.length} frames, one per shot, 2.39:1 banner crop   ·   apply: pick-frames apply ${p.slug} N`);
  const stack = candidates.length === 1 ? `[t0]copy[grid]` : `${candidates.map((_, k) => `[t${k}]`).join("")}xstack=inputs=${candidates.length}:layout=${layout}:fill=#111111[grid]`;
  const fc = `${tiles.join(";")};${stack};[grid]pad=iw:ih+52:0:52:color=#111111,drawtext=fontfile=${FONT}:text='${title}':fontsize=22:fontcolor=white:x=${GAP + 4}:y=16[out]`;
  const sheet = path.join(dir, "sheet.jpg");
  ff(ctx, [...inputs, "-filter_complex", fc, "-map", "[out]", "-frames:v", "1", "-q:v", "4", sheet], `sheet ${p.slug}`);

  const manifest = { slug: p.slug, title: p.title, y, generatedAt: new Date().toISOString(), films: sources.map((s) => ({ file: s.url || path.relative(ctx.root, s.file), duration: s.duration, shots: s.shots.length })), candidates };
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  log(`  -> ${path.relative(ctx.root, sheet)}  (${candidates.length} frames: ${sources.map((s, si) => `${candidates.filter((c) => chosen[c.n - 1].si === si).length} from ${s.label}`).join(", ")})`);
  return sheet;
}

function cmdSheet(ctx, positionals, flags) {
  const data = load(ctx.root);
  const slugs = positionals.length
    ? positionals
    : data.projects.filter((p) => typeof p.featured === "number" && !p.hidden).sort((a, b) => a.featured - b.featured).map((p) => p.slug);
  const opts = { count: Number(flags.count || 20), perFilm: Number(flags["per-film"] || 80), scene: Number(flags.scene || 0.3), previews: !!flags.previews };
  if (!(opts.count >= 1 && opts.count <= 40)) throw new UserError("--count must be between 1 and 40.");
  if (!(opts.perFilm >= 2)) throw new UserError("--per-film must be at least 2.");
  if (!(opts.scene > 0 && opts.scene < 1)) throw new UserError("--scene is the cut sensitivity, between 0 and 1 (default 0.3; lower finds more cuts).");
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
        if (k === "thumbnail" || k === "poster") continue; // re-inserted below, never copied back over the new value
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
  sheet [slug ...] [--count 20] [--per-film 80] [--scene 0.3] [--previews] [--y 0..1]   contact sheets in .frames/<slug>/sheet.jpg
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
