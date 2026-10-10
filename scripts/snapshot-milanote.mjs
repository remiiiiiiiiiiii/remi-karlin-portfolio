#!/usr/bin/env node
// Capture a read-only Milanote board as one WebP, for the mood board viewer on a project page.
//
//   node scripts/snapshot-milanote.mjs <read-only board url> <out.webp> [--width 2400] [--wait 15000]
//   npm run moodboard -- "https://app.milanote.com/<id>?p=<token>" public/images/the-outfiters/moodboard.webp
//
// Opens the board in headless Chrome at a viewport large enough to hold the whole board, measures the
// cards' extent, screenshots that region and writes it as a WebP of the given width (plus a -tiny.webp
// blur-up). Re-run whenever the board changes. Chrome: /Applications/Google Chrome.app.
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";

const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FFMPEG = process.env.FFMPEG || "/Users/remikarlin/.local/bin/ffmpeg";
const args = process.argv.slice(2);
const flag = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const [url, outArg] = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
if (!url || !outArg) { console.error("usage: snapshot-milanote.mjs <board url> <out.webp> [--width 2400] [--wait 15000]"); process.exit(2); }
const out = resolve(outArg);
const width = Number(flag("width", 2400));
const wait = Number(flag("wait", 15000));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profiles = [];

/** Fresh headless Chrome + CDP session. Returns helpers and a close(). */
async function browser(vw, vh) {
  const port = 9350 + Math.floor(Math.random() * 500);
  // One profile for every browser of this run (they run one at a time): the HTTP cache then serves the
  // board's images after the first load instead of re-downloading them for each tile.
  if (!profiles.length) profiles.push(mkdtempSync(join(tmpdir(), "milanote-")));
  const profile = profiles[0];
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${vw},${vh}`, "about:blank"], { stdio: "ignore" });
  let t = null;
  for (let i = 0; i < 60 && !t; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); t = l.find((x) => x.type === "page") || null; } catch {} if (!t) await sleep(250); }
  if (!t) { chrome.kill(); throw new Error("Chrome did not start"); }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}, timeoutMs = 60000) => new Promise((resolve, reject) => {
    const i = ++id;
    const timer = setTimeout(() => { pending.delete(i); reject(new Error(`${method} timed out after ${timeoutMs / 1000} s`)); }, timeoutMs);
    pending.set(i, (m) => { clearTimeout(timer); resolve(m); });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const evalJs = async (expression) => { const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: vw, height: vh, deviceScaleFactor: 1, mobile: false });
  return { send, evalJs, close: () => { try { ws.close(); } catch {} chrome.kill(); } };
}

const MEASURE = `(() => { const d=document.querySelector('.canvas-document'); if (!d) return null; let sc=d; while (sc && sc!==document.body) { const st=getComputedStyle(sc); if (/(auto|scroll)/.test(st.overflow+st.overflowX+st.overflowY)) break; sc=sc.parentElement; } const sr=sc.getBoundingClientRect(); const els=[...d.querySelectorAll('[class*="element"], img')].map(e=>e.getBoundingClientRect()).filter(b=>b.width>10&&b.height>10); return { n: els.length, viewTop: Math.round(sr.top), viewLeft: Math.round(sr.left), viewW: sc.clientWidth, viewH: sc.clientHeight, minX: Math.min(...els.map(b=>b.left)) + sc.scrollLeft - sr.left, minY: Math.min(...els.map(b=>b.top)) + sc.scrollTop - sr.top, maxX: Math.max(...els.map(b=>b.right)) + sc.scrollLeft - sr.left, maxY: Math.max(...els.map(b=>b.bottom)) + sc.scrollTop - sr.top, docW: d.scrollWidth, docH: d.scrollHeight }; })()`;
// The cookie notice is OneTrust's banner; also drop the reCAPTCHA badge and Milanote's toast layers before each shot.
const HIDE_BANNER = `(() => { for (const sel of ['#onetrust-banner-sdk', '#onetrust-consent-sdk', '.grecaptcha-badge', '#engagement-toast-container', '#engagement-nudges-banner-sticky-container']) for (const el of document.querySelectorAll(sel)) el.remove(); for (const el of document.querySelectorAll('[class*="cookie" i], [id*="cookie" i]')) { const r=el.getBoundingClientRect(); if (r.height > 0 && r.height < 400 && r.width > 200) el.style.display='none'; } })()`;
/** Wait until the board's cards are in the DOM (up to 60 s), then a little more for images. */
async function waitForBoard(b) {
  for (let i = 0; i < 60; i++) {
    const m = await b.evalJs(MEASURE);
    if (m && m.n > 0) { await sleep(Math.min(wait, 4000)); return m; }
    await sleep(1000);
  }
  throw new Error("The board did not render within 60 s: is the read-only link enabled and public?");
}
const scrollJs = (sx, sy) => `(() => { const d=document.querySelector('.canvas-document'); let sc=d; while (sc && sc!==document.body) { const st=getComputedStyle(sc); if (/(auto|scroll)/.test(st.overflow+st.overflowX+st.overflowY)) break; sc=sc.parentElement; } sc.scrollTo(${sx}, ${sy}); return [sc.scrollLeft, sc.scrollTop]; })()`;

// Milanote only paints what is near the viewport, Chrome will not rasterise a board-sized surface, and the
// headless renderer stops delivering frames after a programmatic scroll. So: one fresh Chrome per tile,
// loaded, scrolled once, captured once; tiles are then stitched with ffmpeg.
const VW = 2560, VH = 1600;
try {
  const b0 = await browser(VW, VH);
  await b0.send("Page.navigate", { url });
  const m = await waitForBoard(b0);
  b0.close();
  if (!m || !m.n) throw new Error("No cards found: is the read-only link enabled and public?");
  const pad = 40;
  const x0 = Math.max(0, Math.floor(m.minX - pad)), y0 = Math.max(0, Math.floor(m.minY - pad));
  const W = Math.ceil(m.maxX + pad) - x0, H = Math.ceil(m.maxY + pad) - y0;
  const tw = m.viewW, th = m.viewH;
  const cols = Math.ceil(W / tw), rows = Math.ceil(H / th);
  console.log(`board ${Math.round(m.docW)}x${Math.round(m.docH)}, ${m.n} cards, content ${W}x${H} at (${x0},${y0}) -> ${cols}x${rows} tiles of ${tw}x${th}`);
  const jobs = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) jobs.push({ r, c, sx: Math.min(x0 + c * tw, Math.max(0, m.docW - tw)), sy: Math.min(y0 + r * th, Math.max(0, m.docH - th)) });
  const tiles = new Array(jobs.length);
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const k = next++; const j = jobs[k];
      for (let attempt = 1; attempt <= 4; attempt++) {
        const b = await browser(VW, VH);
        try {
          await b.send("Page.navigate", { url });
          await waitForBoard(b);
          await sleep(wait);
          await b.evalJs(HIDE_BANNER);
          const got = await b.evalJs(scrollJs(j.sx, j.sy));
          if (!got) throw new Error("scroll failed");
          await sleep(3000);
          // JPEG: a full-size PNG capture of a tile this busy stalls headless Chrome; the result is WebP anyway.
          const shot = await b.send("Page.captureScreenshot", { format: "jpeg", quality: 92, clip: { x: m.viewLeft, y: m.viewTop, width: tw, height: th, scale: 1 } }, 60000);
          const file = join(profiles[0], `tile-${j.r}-${j.c}.jpg`);
          writeFileSync(file, Buffer.from(shot.result.data, "base64"));
          tiles[k] = { file, x: got[0] - x0, y: got[1] - y0 };
          console.log(`  tile ${j.r + 1}/${rows} ${j.c + 1}/${cols} at ${got[0]},${got[1]} ok`);
          break;
        } catch (e) {
          console.log(`  tile ${j.r + 1}/${rows} ${j.c + 1}/${cols}: ${e.message}${attempt < 4 ? ", retrying" : ""}`);
          if (attempt === 4) throw e;
        } finally { b.close(); }
      }
    }
  }
  // One browser at a time: parallel instances made the screenshot call stall.
  await worker();
  // Stitch: overlay every tile on a canvas of W x H.
  const inputs = tiles.flatMap((t) => ["-i", t.file]);
  let fc = `color=c=0xf3f3f3:s=${W}x${H}[base]`;
  let prev = "[base]";
  tiles.forEach((t, i) => { const o = i === tiles.length - 1 ? "[out]" : `[o${i}]`; fc += `;${prev}[${i}:v]overlay=${t.x}:${t.y}${o}`; prev = o; });
  const png = join(profiles[0], "board.png");
  let r = spawnSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...inputs, "-filter_complex", fc, "-map", "[out]", "-frames:v", "1", png], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
  mkdirSync(dirname(out), { recursive: true });
  const q = ["-c:v", "libwebp", "-quality", "82", "-compression_level", "6"];
  r = spawnSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", "-i", png, "-frames:v", "1", "-vf", `scale=${Math.min(width, W)}:-2:flags=lanczos`, ...q, out], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
  const tiny = out.replace(/\.webp$/, "-tiny.webp");
  r = spawnSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", "-i", out, "-frames:v", "1", "-vf", "scale=32:-2:flags=lanczos", ...q, tiny], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
  const dims = spawnSync(FFMPEG.replace(/ffmpeg$/, "ffprobe"), ["-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0", out], { encoding: "utf8" }).stdout.trim();
  console.log(`wrote ${out} (${dims}, ${Math.round(statSync(out).size / 1024)} KB) + ${tiny}`);
} finally {
  for (const p of profiles) rmSync(p, { recursive: true, force: true });
}
