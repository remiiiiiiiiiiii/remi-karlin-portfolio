#!/usr/bin/env node
// Reusable media pipeline for the portfolio (Node 24, no dependencies).
//
//   node scripts/optimize-media.mjs --all            everything under public/
//   node scripts/optimize-media.mjs <file> [<file>]  specific files
//   node scripts/optimize-media.mjs thumb <src> <slug> [--y 0..1]   2.39:1 case-study thumbnail
//   flags: --dry (report only), --keep-originals (do not delete source images),
//          --from <dir> (re-encode previews from the full-quality originals in <dir>, always),
//          --force-posters (regenerate posters even when they exist)
//
// Previews  (public/videos/*-preview.mp4)  re-encoded IN PLACE: <= 8 s, no audio,
//   long edge <= 1280, H.264 CRF 28, built for a full-bleed edge-to-edge hero:
//   - baked-in letterbox / pillarbox bars are cropped (cropdetect over the first 8 s; a crop is
//     applied when any side has >= 8 px of bars; the detected rect is kept even if not 16:9);
//   - clips that open letterboxed and animate the bars away (b1nbags-1) are trimmed to start at
//     the first bar-free frame, when >= 3 s remain;
//   - BOTTOM_STRIP lists clips with burned-in captions: the strip is cropped only when the result
//     stays >= 2:1 wide, otherwise the captions are kept.
//   Posters are written to public/videos/posters/<basename>.webp (1280 px, q80) and
//   <basename>-tiny.webp (24 px). The frame is picked automatically: the earliest of
//   0.5/1/1.5/2/2.5/3/4 s whose mean luma (YAVG) is 40..200, else the brightest.
//   POSTER_TIMES overrides the candidate list for clips whose early frames show a caption or a face.
// Thumbs    (thumb <src> <slug>) -> public/images/thumbs/<slug>.webp (1280x536, q80, scale then
//   crop) and <slug>-tiny.webp (24 px). --y sets the vertical crop anchor (0 top, 1 bottom, default .5).
// Images    (public/images/**.png|jpg|jpeg)  -> .webp next to the original (q80).
//   Long edge capped at 1600 px (fan-yan, modessec, the-outfiters-mood, halatia) or 2400 px.
//   The original is removed (git rm when tracked) only when the WebP is smaller;
//   lossless WebP is tried when lossy is bigger (flat-colour graphics).
//   Existing .webp images wider than the cap are downscaled in place.
// Idempotent: previews that already meet the target (no audio, short, low bitrate, no bars) and
// existing posters/thumbs are skipped (thumbs are rewritten, they are cheap and deterministic).
// Full-length videos (no "-preview" in the name) are never touched.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const FFMPEG = process.env.FFMPEG || (existsSync('/Users/remikarlin/.local/bin/ffmpeg') ? '/Users/remikarlin/.local/bin/ffmpeg' : 'ffmpeg');
const FFPROBE = process.env.FFPROBE || (existsSync('/Users/remikarlin/.local/bin/ffprobe') ? '/Users/remikarlin/.local/bin/ffprobe' : 'ffprobe');
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const POSTERS = join(PUBLIC, 'videos', 'posters');
const MAX_SECONDS = 8;
const MAX_DURATION_OK = 8.1;
const MAX_BITRATE_OK = 2_500_000;
const THUMBS = join(PUBLIC, 'images', 'thumbs');
const BAR_MIN_PX = 8;
const MIN_TRIM_REMAINING = 3;
const POSTER_TIMES = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0];
const YAVG_MIN = 40, YAVG_MAX = 200;
// burned-in caption strips (px from the bottom of the source frame, after bar removal)
const BOTTOM_STRIP = { 'solene-preview': 85 };
// per-clip poster candidate times (seconds in the FINAL clip) when the automatic first pick shows a caption/face
// (reviewed by eye 2026-10: the automatic pick landed on a black/empty/dark frame, a title card, a caption or a pulled face)
// hong-kong-preview and solene-preview carry a caption/lyric on EVERY frame: no clean frame exists, so their pick is just the best-looking one.
const POSTER_OVERRIDES = {
  'fan-yan-1-preview': [3.5],              // opens on black / out-of-focus circle
  'hong-kong-cliff-preview': [6.0],        // night clip: first frame where the seated figure reads
  'hong-kong-lantau-preview': [5.5],       // first 5 s are an empty sky; figure on the summit appears at 5.5
  'essec-wei-aftermovie-preview': [5.5],   // black at 0.5 s, face pulled at 1 s
  'hong-kong-preview': [0.5],              // skyline; caption is on every frame of the clip
  'solene-preview': [7.5],                 // burned-in lyrics on every frame; street scene reads best
  'spain-preview': [5.0],                  // title card over the first 2.5 s, windshield shots after
  'b1nbags-shot-expresso-preview': [3.0],  // "MATHIS" title over the first second
  'essec-modessec-aftermovie-preview': [6.0], // dark opening with photographer credit
};
const GALLERY_DIRS = ['fan-yan', 'modessec', 'the-outfiters-mood', 'halatia', 'unfold-agency'];

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const dry = flags.has('--dry');
const keep = flags.has('--keep-originals');
const forcePosters = flags.has('--force-posters');
const optVal = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const FROM = optVal('--from') ? resolve(optVal('--from')) : null;
const VALUE_FLAGS = new Set(['--from', '--y']);
const tmp = mkdtempSync(join(tmpdir(), 'optimize-media-'));
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
const size = (p) => statSync(p).size;

function run(cmd, argv) {
  const r = spawnSync(cmd, argv, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${cmd} failed: ${(r.stderr || '').split('\n').slice(-4).join(' ')}`);
  return r.stdout;
}
const ff = (argv) => run(FFMPEG, ['-y', '-loglevel', 'error', ...argv]);

function isTracked(file) {
  try { execFileSync('git', ['ls-files', '--error-unmatch', '--', file], { cwd: ROOT, stdio: 'ignore' }); return true; }
  catch { return false; }
}
function removeOriginal(file) {
  if (keep) return;
  if (isTracked(file)) execFileSync('git', ['rm', '-q', '-f', '--', file], { cwd: ROOT });
  else rmSync(file);
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

function probe(file) {
  const j = JSON.parse(run(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration,bit_rate:stream=codec_type', '-of', 'json', file]));
  return {
    duration: parseFloat(j.format.duration),
    bitrate: parseInt(j.format.bit_rate, 10),
    audio: (j.streams || []).some((s) => s.codec_type === 'audio'),
  };
}

const even = (n) => Math.floor(n / 2) * 2;

function probeVideo(file) {
  const j = JSON.parse(run(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', file]));
  return j.streams[0];
}

// Last crop rect that cropdetect reports over the first 8 s (cumulative: the union of all frames,
// so dark scenes do not shrink it). Returns {w,h,x,y}.
function cropdetect(file, round) {
  const r = spawnSync(FFMPEG, ['-i', file, '-t', String(MAX_SECONDS), '-vf', `cropdetect=24:${round}:0`, '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const m = [...(r.stderr || '').matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)].pop();
  if (!m) return null;
  return { w: +m[1], h: +m[2], x: +m[3], y: +m[4] };
}

function barsOf(rect, W, H) {
  return Math.max(rect.x, W - rect.x - rect.w, rect.y, H - rect.y - rect.h);
}

// Static bars -> crop rect (null when none). Decided with round 16 (>= 8 px), rect refined with round 2.
function detectStaticCrop(file, W, H) {
  const coarse = cropdetect(file, 16);
  if (!coarse || barsOf(coarse, W, H) < BAR_MIN_PX) return { rect: null, coarse };
  const fine = cropdetect(file, 2) || coarse;
  return { rect: { w: even(fine.w), h: even(fine.h), x: fine.x, y: fine.y }, coarse };
}

// Clips that open letterboxed and animate the bars away: returns the time of the first bar-free frame
// (null when the clip has no leading bars, or when they never go away / too little footage would remain).
function detectLeadingBars(file, W, H, duration) {
  const r = spawnSync(FFMPEG, ['-i', file, '-t', String(MAX_SECONDS), '-vf', 'cropdetect=24:2:1', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const rows = [...(r.stderr || '').matchAll(/ t:([\d.]+) limit:[\d.]+ crop=(\d+):(\d+):(\d+):(\d+)/g)].map((m) => {
    const [t, w, h, x, y] = [+m[1], +m[2], +m[3], +m[4], +m[5]];
    // letterbox/pillarbox only: the other axis stays full (dark scenes shrink both axes)
    const vbars = x < BAR_MIN_PX && W - x - w < BAR_MIN_PX && (y >= BAR_MIN_PX || H - y - h >= BAR_MIN_PX);
    const hbars = y < BAR_MIN_PX && H - y - h < BAR_MIN_PX && (x >= BAR_MIN_PX || W - x - w >= BAR_MIN_PX);
    return { t, bars: vbars || hbars };
  });
  if (!rows.length || rows[0].t > 0.25 || !rows[0].bars) return null;
  let end = rows[0].t, lastBar = rows[0].t;
  for (const row of rows) { if (row.bars) lastBar = row.t; else if (row.t - lastBar > 0.1) break; end = lastBar; }
  if (end < 1.0) return null;                       // a short flash of dark frames is content, not bars
  if (end > duration * 0.6) return null;            // bars never open: static case, handled by the crop
  const ss = Math.ceil((end + 0.1) * 24) / 24;
  return duration - ss >= MIN_TRIM_REMAINING ? ss : null;
}

function lumaAt(file, t) {
  const r = spawnSync(FFMPEG, ['-loglevel', 'error', '-ss', String(t), '-i', file, '-frames:v', '1', '-vf', 'scale=64:36:flags=area,format=gray', '-f', 'rawvideo', '-'], { maxBuffer: 1024 * 1024 });
  if (r.status !== 0 || !r.stdout.length) return null;
  let sum = 0; for (const b of r.stdout) sum += b;
  return sum / r.stdout.length;
}

// Earliest candidate frame with mean luma in [40,200]; else the brightest. Returns {t, yavg, sampled}.
function pickPoster(file, name, duration) {
  const cands = (POSTER_OVERRIDES[name] || POSTER_TIMES).filter((t) => t <= duration - 0.1);
  if (!cands.length) cands.push(0);
  const sampled = [];
  for (const t of cands) { const y = lumaAt(file, t); if (y != null) sampled.push({ t, y }); }
  const good = sampled.find((s) => s.y >= YAVG_MIN && s.y <= YAVG_MAX);
  const pick = good || sampled.reduce((a, b) => (b.y > a.y ? b : a), sampled[0]);
  return { t: pick.t, yavg: pick.y, sampled };
}

function writePosters(file, name, report) {
  mkdirSync(POSTERS, { recursive: true });
  const poster = join(POSTERS, `${name}.webp`);
  const tiny = join(POSTERS, `${name}-tiny.webp`);
  if (!forcePosters && existsSync(poster) && existsSync(tiny)) return;
  const pk = pickPoster(file, name, probe(file).duration);
  report.push(`poster @${pk.t}s (YAVG ${pk.yavg.toFixed(0)})`);
  if (dry) return;
  const q = ['-c:v', 'libwebp', '-quality', '80', '-compression_level', '6'];
  ff(['-ss', String(pk.t), '-i', file, '-frames:v', '1', '-vf', "scale='min(1280,iw)':-2:flags=lanczos", ...q, poster]);
  ff(['-ss', String(pk.t), '-i', file, '-frames:v', '1', '-vf', 'scale=24:-2:flags=lanczos', ...q, tiny]);
}

function optimizePreview(file) {
  const name = basename(file, '.mp4');
  const report = [];
  const src = FROM ? join(FROM, `${name}.mp4`) : file;
  if (!existsSync(src)) throw new Error(`${name}: source missing (${src})`);
  const p = probe(src);
  const { width: W, height: H } = probeVideo(src);
  const { rect } = detectStaticCrop(src, W, H);
  const ss = rect ? null : detectLeadingBars(src, W, H, p.duration);
  let crop = rect;
  const strip = BOTTOM_STRIP[name];
  if (strip) {
    const base = crop || { w: even(W), h: even(H), x: 0, y: 0 };
    const h2 = even(base.h - strip);
    if (base.w / h2 >= 2) crop = { ...base, h: h2 };
    else report.push(`captions kept (${base.w}x${h2} would be ${(base.w / h2).toFixed(2)}:1, under 2:1)`);
  }
  const ok = !p.audio && p.duration <= MAX_DURATION_OK && p.bitrate < MAX_BITRATE_OK;
  if (ok && !crop && ss == null && !FROM) report.push('video: already optimized');
  else if (dry) report.push(`video: would re-encode (${kb(size(src))})${crop ? ` crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}` : ''}${ss != null ? ` start@${ss.toFixed(2)}s` : ''}`);
  else {
    const out = join(tmp, `${name}.mp4`);
    const before = size(file);
    const scale = "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))'";
    const vf = (crop ? `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y},` : '') + scale;
    // CRF 28; clips that still exceed the bitrate budget are retried at CRF 30, 32 (reported)
    let crf = 28, q;
    for (; crf <= 32; crf += 2) {
      ff([...(ss != null ? ['-ss', ss.toFixed(3)] : []), '-i', src, '-t', String(MAX_SECONDS), '-an', '-vf', vf,
        '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
      q = probe(out);
      if (q.bitrate < MAX_BITRATE_OK) break;
    }
    if (q.audio || q.duration > MAX_DURATION_OK || !(q.duration > 0) || q.bitrate >= MAX_BITRATE_OK) throw new Error(`${name}: bad encode`);
    if (crf > 28) report.push(`crf ${crf} (bitrate budget)`);
    renameSync(out, file);
    const v = probeVideo(file);
    report.push(`video: ${kb(before)} -> ${kb(size(file))}, ${v.width}x${v.height}${crop ? ` (crop ${crop.w}:${crop.h}:${crop.x}:${crop.y})` : ''}${ss != null ? ` (start@${ss.toFixed(2)}s)` : ''}`);
  }
  writePosters(file, name, report);
  return report.join('; ');
}

// 2.39:1 case-study thumbnail: scale to 1280 wide, crop 1280x536 at the --y anchor.
function makeThumb(srcArg, slug) {
  const src = resolve(srcArg);
  if (!existsSync(src)) throw new Error(`thumb: missing source ${src}`);
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('thumb: bad slug');
  const yAnchor = optVal('--y') != null ? Math.min(1, Math.max(0, parseFloat(optVal('--y')))) : 0.5;
  mkdirSync(THUMBS, { recursive: true });
  const out = join(THUMBS, `${slug}.webp`);
  const tiny = join(THUMBS, `${slug}-tiny.webp`);
  const q = ['-c:v', 'libwebp', '-quality', '80', '-compression_level', '6'];
  const vf = `scale=1280:-2:flags=lanczos,crop=1280:536:0:'(ih-536)*${yAnchor}'`;
  if (dry) return `would write ${relative(ROOT, out)}`;
  ff(['-i', src, '-frames:v', '1', '-vf', vf, ...q, out]);
  ff(['-i', out, '-frames:v', '1', '-vf', 'scale=24:-2:flags=lanczos', ...q, tiny]);
  return `${relative(ROOT, out)} ${kb(size(out))}, tiny ${size(tiny)} B`;
}

function capFor(file) {
  const rel = relative(join(PUBLIC, 'images'), file).split(sep);
  return rel.some((seg) => GALLERY_DIRS.includes(seg)) ? 1600 : 2400;
}

function optimizeImage(file) {
  const out = file.slice(0, -extname(file).length) + '.webp';
  const cap = capFor(file);
  const vf = `scale='if(gt(iw,ih),min(${cap},iw),-2)':'if(gt(iw,ih),-2,min(${cap},ih))':flags=lanczos`;
  const before = size(file);
  if (dry) return `would convert (${kb(before)}, cap ${cap})`;
  const t1 = join(tmp, 'a.webp');
  ff(['-i', file, '-frames:v', '1', '-vf', vf, '-c:v', 'libwebp', '-quality', '80', '-compression_level', '6', t1]);
  let best = t1;
  if (size(t1) >= before) { // flat graphics: try lossless
    const t2 = join(tmp, 'b.webp');
    ff(['-i', file, '-frames:v', '1', '-vf', vf, '-c:v', 'libwebp', '-lossless', '1', '-compression_level', '6', t2]);
    if (size(t2) < size(t1)) best = t2;
  }
  if (size(best) >= before) return `kept original (${kb(before)}; WebP ${kb(size(best))} not smaller)`;
  renameSync(best, out);
  removeOriginal(file);
  return `${kb(before)} -> ${kb(size(out))}`;
}

// Existing .webp images that are larger than the cap are re-encoded in place (only kept when smaller).
function optimizeWebp(file) {
  const j = JSON.parse(run(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', file]));
  const { width, height } = j.streams[0];
  const cap = capFor(file);
  if (Math.max(width, height) <= cap) return 'already within cap';
  if (dry) return `would downscale ${width}x${height} (cap ${cap})`;
  const before = size(file);
  const t = join(tmp, 'w.webp');
  ff(['-i', file, '-frames:v', '1', '-vf', `scale='if(gt(iw,ih),min(${cap},iw),-2)':'if(gt(iw,ih),-2,min(${cap},ih))':flags=lanczos`, '-c:v', 'libwebp', '-quality', '80', '-compression_level', '6', t]);
  if (size(t) >= before) return `kept (${kb(before)}; re-encode ${kb(size(t))} not smaller)`;
  renameSync(t, file);
  return `${kb(before)} -> ${kb(size(file))}`;
}

function collect() {
  if (flags.has('--all')) return walk(PUBLIC);
  const out = [];
  for (let i = 0; i < args.length; i++) {
    if (VALUE_FLAGS.has(args[i])) { i++; continue; }
    if (!args[i].startsWith('--')) out.push(resolve(args[i]));
  }
  return out;
}

let n = 0, fail = 0;
if (args[0] === 'thumb') {
  const [, srcArg, slug] = args;
  if (!srcArg || !slug) { console.error('usage: optimize-media.mjs thumb <src> <slug> [--y 0..1]'); process.exit(2); }
  try { console.log(`thumb ${slug}: ${makeThumb(srcArg, slug)}`); } catch (e) { console.error(e.message); rmSync(tmp, { recursive: true, force: true }); process.exit(1); }
  rmSync(tmp, { recursive: true, force: true });
  process.exit(0);
}
for (const file of (args[0] === 'thumb' ? [] : collect())) {
  if (!existsSync(file)) { console.log(`skip (missing): ${file}`); continue; }
  const ext = extname(file).toLowerCase();
  const rel = relative(ROOT, file);
  try {
    if (ext === '.mp4' && basename(file).endsWith('-preview.mp4') && dirname(file) === join(PUBLIC, 'videos')) {
      console.log(`${rel}: ${optimizePreview(file)}`); n++;
    } else if (ext === '.webp' && file.startsWith(join(PUBLIC, 'images') + sep)) {
      console.log(`${rel}: ${optimizeWebp(file)}`); n++;
    } else if (['.jpg', '.jpeg', '.png'].includes(ext) && file.startsWith(join(PUBLIC, 'images') + sep)) {
      const r = optimizeImage(file);
      // images kept because WebP was larger are re-tried on every run; only log changes quietly
      console.log(`${rel}: ${r}`); n++;
    }
  } catch (e) { fail++; console.error(`${rel}: ERROR ${e.message}`); }
}
rmSync(tmp, { recursive: true, force: true });
console.log(`done: ${n} files processed, ${fail} errors${dry ? ' (dry run)' : ''}`);
process.exit(fail ? 1 : 0);
