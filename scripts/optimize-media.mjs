#!/usr/bin/env node
// Reusable media pipeline for the portfolio (Node 24, no dependencies).
//
//   node scripts/optimize-media.mjs --all            everything under public/
//   node scripts/optimize-media.mjs <file> [<file>]  specific files
//   flags: --dry (report only), --keep-originals (do not delete source images)
//
// Previews  (public/videos/*-preview.mp4)  re-encoded IN PLACE: <= 8 s, no audio,
//   long edge <= 1280, H.264 CRF 28. Posters are written to
//   public/videos/posters/<basename>.webp (1280 px, q80) and <basename>-tiny.webp (24 px).
// Images    (public/images/**.png|jpg|jpeg)  -> .webp next to the original (q80).
//   Long edge capped at 1600 px (fan-yan, modessec, the-outfiters-mood, halatia) or 2400 px.
//   The original is removed (git rm when tracked) only when the WebP is smaller;
//   lossless WebP is tried when lossy is bigger (flat-colour graphics).
//   Existing .webp images wider than the cap are downscaled in place.
// Idempotent: previews that already meet the target and existing posters are skipped.
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
const GALLERY_DIRS = ['fan-yan', 'modessec', 'the-outfiters-mood', 'halatia', 'unfold-agency'];

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const dry = flags.has('--dry');
const keep = flags.has('--keep-originals');
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

function optimizePreview(file) {
  const name = basename(file, '.mp4');
  const report = [];
  const p = probe(file);
  const ok = !p.audio && p.duration <= MAX_DURATION_OK && p.bitrate < MAX_BITRATE_OK;
  if (ok) report.push('video: already optimized');
  else if (dry) report.push(`video: would re-encode (${kb(size(file))})`);
  else {
    const out = join(tmp, `${name}.mp4`);
    const before = size(file);
    ff(['-i', file, '-t', String(MAX_SECONDS), '-an',
      '-vf', "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))'",
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
    const q = probe(out);
    if (q.audio || q.duration > MAX_DURATION_OK || !(q.duration > 0)) throw new Error(`${name}: bad encode`);
    renameSync(out, file);
    report.push(`video: ${kb(before)} -> ${kb(size(file))}`);
  }
  // posters (taken from the optimized file)
  mkdirSync(POSTERS, { recursive: true });
  const poster = join(POSTERS, `${name}.webp`);
  const tiny = join(POSTERS, `${name}-tiny.webp`);
  const at = Math.min(1.0, Math.max(0, probe(file).duration - 0.1));
  if (!existsSync(poster)) {
    if (!dry) ff(['-ss', String(at), '-i', file, '-frames:v', '1', '-vf', "scale='min(1280,iw)':-2:flags=lanczos", '-c:v', 'libwebp', '-quality', '80', '-compression_level', '6', poster]);
    report.push('poster written');
  }
  if (!existsSync(tiny)) {
    if (!dry) ff(['-ss', String(at), '-i', file, '-frames:v', '1', '-vf', 'scale=24:-2:flags=lanczos', '-c:v', 'libwebp', '-quality', '80', '-compression_level', '6', tiny]);
    report.push('tiny poster written');
  }
  return report.join('; ');
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
  return args.filter((a) => !a.startsWith('--')).map((a) => resolve(a));
}

let n = 0, fail = 0;
for (const file of collect()) {
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
