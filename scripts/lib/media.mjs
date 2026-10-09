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

export function findFfprobe(ffmpeg) {
  const sibling = ffmpeg && ffmpeg.includes(path.sep) ? path.join(path.dirname(ffmpeg), "ffprobe") : null;
  const candidates = [process.env.FFPROBE, "/Users/remikarlin/.local/bin/ffprobe", sibling, "ffprobe"].filter(Boolean);
  for (const c of candidates) {
    const r = spawnSync(c, ["-version"], { encoding: "utf8" });
    if (r.status === 0) return c;
  }
  return null;
}

/** { width, height, duration } of a video or image as displayed (rotation applied). ffprobe when available, else ffmpeg's banner. */
export function probeMedia(ffmpeg, file) {
  const probe = findFfprobe(ffmpeg);
  let width = 0, height = 0, duration = 0, rotation = 0;
  if (probe) {
    const r = spawnSync(probe, [
      "-v", "error", "-select_streams", "v:0",
      "-show_entries", "stream=width,height:stream_tags=rotate:stream_side_data=rotation:format=duration",
      "-of", "json", file,
    ], { encoding: "utf8" });
    if (r.status === 0) {
      try {
        const j = JSON.parse(r.stdout);
        const st = (j.streams || [])[0] || {};
        width = Number(st.width) || 0; height = Number(st.height) || 0;
        duration = Number((j.format || {}).duration) || 0;
        const side = (st.side_data_list || []).find((d) => d.rotation !== undefined);
        rotation = Number(side ? side.rotation : (st.tags || {}).rotate) || 0;
      } catch {}
    }
  }
  if (!width || !height) {
    const r = spawnSync(ffmpeg, ["-hide_banner", "-i", file], { encoding: "utf8" });
    const text = r.stderr || "";
    const v = text.match(/Video: .*?, (\d+)x(\d+)/);
    if (v) { width = Number(v[1]); height = Number(v[2]); }
    const d = text.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (d) duration = Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]);
    const rot = text.match(/rotation of (-?\d+(?:\.\d+)?) degrees/);
    if (rot) rotation = Number(rot[1]);
  }
  if (!width || !height) throw new UserError(`Could not read the size of ${path.basename(file)} (is it a video or image?).`);
  if (Math.abs(rotation) % 180 === 90) [width, height] = [height, width];
  return { width, height, duration };
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

/** Self-hosted full film: H.264 CRF 26, long edge <= 1920 (even sizes), AAC 128k, faststart. */
export function encodeFull(ffmpeg, input, out) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  run(ffmpeg, [
    "-y", "-i", input,
    "-vf", "scale='if(gt(iw,ih),min(1920,iw),-2)':'if(gt(iw,ih),-2,min(1920,ih))',scale=trunc(iw/2)*2:trunc(ih/2)*2",
    "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", out,
  ], `full film ${path.basename(input)}`);
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

/** Path of the repo's optimize-media script when present; `thumb` / `image` are true when it has those subcommands. */
export function findOptimizer(root) {
  const script = path.join(root, "scripts", "optimize-media.mjs");
  if (!fs.existsSync(script)) return null;
  const src = fs.readFileSync(script, "utf8");
  return { script, thumb: /['"]thumb['"]/.test(src), image: /['"]image['"]/.test(src) };
}

/** Run optimize-media.mjs with args; its cwd is the repo root. Throws UserError on failure. */
export function runOptimizer(opt, root, args, what) {
  const r = spawnSync(process.execPath, [opt.script, ...args], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new UserError(`optimize-media failed (${what}): ${((r.stderr || "") + (r.stdout || "")).trim().split("\n").slice(-3).join(" | ")}`);
  return r.stdout;
}
