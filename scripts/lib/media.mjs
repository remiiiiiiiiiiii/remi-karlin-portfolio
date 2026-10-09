import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { UserError } from "./args.mjs";

export function findFfmpeg() {
  const candidates = [process.env.FFMPEG, "/Users/remikarlin/.local/bin/ffmpeg", "ffmpeg"].filter(Boolean);
  for (const c of candidates) {
    const r = spawnSync(c, ["-version"], { encoding: "utf8" });
    if (r.status === 0) return c;
  }
  throw new UserError("ffmpeg not found. Set FFMPEG=/path/to/ffmpeg or install it (expected at /Users/remikarlin/.local/bin/ffmpeg).");
}

function run(ffmpeg, args, what) {
  const r = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", ...args], { encoding: "utf8" });
  if (r.status !== 0) throw new UserError(`ffmpeg failed (${what}): ${(r.stderr || "").trim().split("\n").slice(-3).join(" | ")}`);
}

/** 8 s, no audio, max 1280 on the long side, h264 crf 28, faststart. */
export function encodePreview(ffmpeg, input, out) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  run(ffmpeg, [
    "-y", "-i", input, "-t", "8", "-an",
    "-vf", "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))'",
    "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", out,
  ], `preview ${path.basename(input)}`);
}

/** Writes <base>.webp (1280 wide) and <base>-tiny.webp (24 wide) into postersDir. Returns the two paths. */
export function makePosters(ffmpeg, previewMp4, postersDir) {
  fs.mkdirSync(postersDir, { recursive: true });
  const base = path.basename(previewMp4, ".mp4");
  const big = path.join(postersDir, `${base}.webp`);
  const tiny = path.join(postersDir, `${base}-tiny.webp`);
  for (const [out, width] of [[big, 1280], [tiny, 24]]) {
    const args = (ss) => ["-y", "-ss", ss, "-i", previewMp4, "-frames:v", "1", "-vf", `scale=${width}:-2`, "-c:v", "libwebp", "-quality", "80", out];
    try { run(ffmpeg, args("1"), `poster ${base}`); if (!fs.existsSync(out)) throw new Error("empty"); }
    catch { run(ffmpeg, args("0"), `poster ${base}`); }
  }
  return [big, tiny];
}

/** Any still -> webp, max 1600 wide. */
export function convertImage(ffmpeg, input, out) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  run(ffmpeg, [
    "-y", "-i", input,
    "-vf", "scale='min(1600,iw)':-2:flags=lanczos",
    "-c:v", "libwebp", "-quality", "80", "-compression_level", "6", out,
  ], `image ${path.basename(input)}`);
}

export const THUMB_W = 1280;
export const THUMB_H = 536; // 2.39:1

/** Any still -> 2.39:1 WebP (crop to fill; y = vertical anchor 0 top .. 1 bottom) at <dir>/<slug>.webp plus <slug>-tiny.webp (24 px wide). Returns both paths. */
export function makeThumbnail(ffmpeg, input, dir, slug, y = 0.5) {
  fs.mkdirSync(dir, { recursive: true });
  const big = path.join(dir, `${slug}.webp`);
  const tiny = path.join(dir, `${slug}-tiny.webp`);
  const fill = `scale=${THUMB_W}:${THUMB_H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${THUMB_W}:${THUMB_H}:(iw-${THUMB_W})/2:(ih-${THUMB_H})*${y}`;
  run(ffmpeg, ["-y", "-i", input, "-frames:v", "1", "-vf", fill, "-c:v", "libwebp", "-quality", "80", "-compression_level", "6", big], `thumbnail ${path.basename(input)}`);
  run(ffmpeg, ["-y", "-i", input, "-frames:v", "1", "-vf", `${fill},scale=24:10:flags=lanczos`, "-c:v", "libwebp", "-quality", "80", tiny], `thumbnail ${path.basename(input)}`);
  return [big, tiny];
}

/** Path of the repo's optimize-media script when present; `thumb` is true when it has the thumb subcommand. */
export function findOptimizer(root) {
  const script = path.join(root, "scripts", "optimize-media.mjs");
  if (!fs.existsSync(script)) return null;
  const src = fs.readFileSync(script, "utf8");
  return { script, thumb: /['"]thumb['"]/.test(src) };
}

/** Run optimize-media.mjs with args; its cwd is the repo root. Throws UserError on failure. */
export function runOptimizer(opt, root, args, what) {
  const r = spawnSync(process.execPath, [opt.script, ...args], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new UserError(`optimize-media failed (${what}): ${((r.stderr || "") + (r.stdout || "")).trim().split("\n").slice(-3).join(" | ")}`);
  return r.stdout;
}
