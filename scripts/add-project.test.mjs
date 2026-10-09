#!/usr/bin/env node
// Plain-node tests. Runs add-project.mjs against a temp copy of the repo skeleton
// (data/projects.json + empty public/ + app/work/halatia) and 2-second generated media.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { findFfmpeg } from "./lib/media.mjs";
import { parseYoutubeId } from "./lib/youtube.mjs";
import { classifyAspect, parseAgency, pendingCount } from "./lib/ops.mjs";
import { serialize } from "./lib/store.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, "..");
const CLI = path.join(HERE, "add-project.mjs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "add-project-test-"));
const root = path.join(tmp, "site");
fs.mkdirSync(path.join(root, "data"), { recursive: true });
fs.mkdirSync(path.join(root, "public", "videos"), { recursive: true });
fs.mkdirSync(path.join(root, "app", "work", "halatia"), { recursive: true });
fs.copyFileSync(path.join(REPO, "data", "projects.json"), path.join(root, "data", "projects.json"));
const dataFile = path.join(root, "data", "projects.json");

const ffmpeg = findFfmpeg();
const clip = path.join(tmp, "clip.mp4");
const clip2 = path.join(tmp, "clip2.mp4");
const still = path.join(tmp, "My Still 01.png");
for (const out of [clip, clip2]) {
  const r = spawnSync(ffmpeg, ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=640x360:rate=24:duration=2", "-pix_fmt", "yuv420p", out]);
  assert.equal(r.status, 0, "could not generate test clip");
}
assert.equal(spawnSync(ffmpeg, ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=800x600", "-frames:v", "1", still]).status, 0);
/** Test film with a sine track: size WxH, d seconds. */
const makeFilm = (out, size, d) => assert.equal(spawnSync(ffmpeg, [
  "-y", "-loglevel", "error", "-f", "lavfi", "-i", `testsrc=size=${size}:rate=24:duration=${d}`,
  "-f", "lavfi", "-i", `sine=frequency=440:duration=${d}`, "-pix_fmt", "yuv420p", "-shortest", out,
]).status, 0, "could not generate test film");
const landscape = path.join(tmp, "landscape.mp4");
const vertical = path.join(tmp, "vertical.mp4");
const longFilm = path.join(tmp, "long.mp4");
makeFilm(landscape, "640x360", 2);
makeFilm(vertical, "360x640", 2);
makeFilm(longFilm, "160x90", 41);
const still2 = path.join(tmp, "Second.PNG");
assert.equal(spawnSync(ffmpeg, ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=2400x1200", "-frames:v", "1", still2]).status, 0);

const runIn = (r0, ...args) => {
  const r = spawnSync("node", [CLI, "--root", r0, ...args], { encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr, all: r.stdout + r.stderr };
};
const run = (...args) => runIn(root, ...args);
/** "WxH" of an image, read from ffmpeg's banner. */
const dims = (file) => {
  const r = spawnSync(ffmpeg, ["-hide_banner", "-i", file], { encoding: "utf8" });
  const m = (r.stderr || "").match(/Video: .*?, (\d+)x(\d+)/);
  return m ? `${m[1]}x${m[2]}` : null;
};
const data = () => JSON.parse(fs.readFileSync(dataFile, "utf8")).projects;
const initialCount = data().length;
const get = (slug) => data().find((p) => p.slug === slug);
const exists = (...p) => fs.existsSync(path.join(root, "public", ...p));
const hash = () => crypto.createHash("sha1").update(fs.readFileSync(dataFile)).digest("hex");

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`ok   ${name}`); }
  catch (e) { console.error(`FAIL ${name}\n${e.stack}`); process.exitCode = 1; }
}

test("youtube id parsing handles every URL form", () => {
  for (const u of [
    "https://youtu.be/dQw4w9WgXcQ?si=abc", "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3s",
    "https://youtube.com/embed/dQw4w9WgXcQ", "https://youtube.com/shorts/dQw4w9WgXcQ?feature=share",
    "youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ",
  ]) assert.equal(parseYoutubeId(u), "dQw4w9WgXcQ", u);
  assert.throws(() => parseYoutubeId("https://example.com/x"));
});

test("serializer keeps the repo's JSON style (inline string arrays, 2-space indent)", () => {
  const sample = { projects: [{ slug: "a", roles: ["Director", "Editor"], videos: [{ title: "T", youtubeId: "x" }], photoGrid: { images: [] } }] };
  const expected = `{
  "projects": [
    {
      "slug": "a",
      "roles": ["Director", "Editor"],
      "videos": [
        {
          "title": "T",
          "youtubeId": "x"
        }
      ],
      "photoGrid": {
        "images": []
      }
    }
  ]
}`;
  assert.equal(serialize(sample), expected);
});

test("aspect classification and agency parsing", () => {
  assert.equal(classifyAspect(1920, 1080), "16:9");
  assert.equal(classifyAspect(1080, 1920), "9:16");
  assert.equal(classifyAspect(1080, 1080), "1:1");
  assert.equal(classifyAspect(1080, 1350), "4:5");
  assert.equal(classifyAspect(1620, 1080), "3:2");
  assert.equal(classifyAspect(2048, 858), "other");
  assert.deepEqual(parseAgency("Havas Play|havas-play"), { name: "Havas Play", slug: "havas-play" });
  assert.deepEqual(parseAgency("Havas Play"), { name: "Havas Play", slug: "havas-play" });
  assert.throws(() => parseAgency("Havas|Bad Slug"));
  assert.equal(pendingCount({ videos: [{ pending: true }, { hosting: "youtube", youtubeId: "" }, { youtubeId: "x" }] }), 2);
});

test("list prints the table", () => {
  const r = run("list");
  assert.equal(r.code, 0);
  assert.match(r.out, /slug\s+category\s+featured\s+hidden\s+videos\s+pending\s+preview\s+thumbnail/);
  assert.match(r.out, /fan-yan\s+film/);
});

const baseArgs = (slug) => [
  "--slug", slug, "--title", "Test Film", "--subtitle", "Sub", "--category", "film", "--tag", "Music Video",
  "--year", "2025", "--location", "Philadelphia", "--roles", "Direction,Cinematography,Editing,Colour",
  "--description", "A test film. Second sentence.", "--short", "Short one.",
];

test("add --dry-run prints the plan and writes nothing", () => {
  const before = hash();
  const r = run("add", ...baseArgs("dry-one"), "--youtube", "https://youtu.be/dQw4w9WgXcQ?si=x|Dry", "--preview", clip, "--featured", "1", "--dry-run");
  assert.equal(r.code, 0, r.all);
  assert.match(r.out, /DRY RUN/);
  assert.match(r.out, /"slug": "dry-one"/);
  assert.equal(hash(), before);
  assert.ok(!exists("videos", "dry-one-preview.mp4"));
});

test("add encodes media, inserts at top of category, default credits, featured 1", () => {
  const r = run("add", ...baseArgs("alpha"), "--youtube", "https://youtu.be/dQw4w9WgXcQ?si=x|Alpha video",
    "--preview", clip, "--image", still, "--featured", "1");
  assert.equal(r.code, 0, r.all);
  const ps = data();
  assert.equal(ps[0].slug, "alpha", "top of film group (fan-yan was first film)");
  const p = ps[0];
  assert.equal(p.featured, 1);
  assert.equal(p.category, "film");
  assert.deepEqual(p.roles, ["Director", "Cinematographer", "Editor", "Colorist"]);
  assert.equal(p.credits.Roles, "Direction · Cinematography · Editing · Color");
  assert.equal(p.credits.Camera, "Lumix S5II");
  assert.equal(p.credits.Lens, "Lumix 20–60mm f/3.5–5.6");
  assert.equal(p.credits.Post, "DaVinci Resolve");
  assert.equal(p.previewVideo, "/videos/alpha-preview.mp4");
  assert.equal(p.videos[0].youtubeId, "dQw4w9WgXcQ");
  assert.equal(p.videos[0].title, "Alpha video");
  assert.equal(p.coverImage, "/images/alpha/my-still-01.webp");
  assert.ok(exists("videos", "alpha-preview.mp4"));
  assert.ok(exists("videos", "posters", "alpha-preview.webp"));
  assert.ok(exists("videos", "posters", "alpha-preview-tiny.webp"));
  assert.ok(exists("images", "alpha", "my-still-01.webp"));
  assert.equal(ps.length, initialCount + 1);
});

test("second featured 1 pushes the first to 2 (dense)", () => {
  const r = run("add", ...baseArgs("beta"), "--youtube", "dQw4w9WgXcQ|Beta", "--preview", clip, "--featured", "1",
    "--credit", "Camera=Sony A7 IV");
  assert.equal(r.code, 0, r.all);
  assert.equal(get("beta").featured, 1);
  assert.equal(get("alpha").featured, 2);
  assert.equal(get("beta").credits.Camera, "Sony A7 IV");
  assert.equal(get("beta").credits.Post, "DaVinci Resolve");
});

test("duplicate slug and custom-route slug are rejected", () => {
  assert.notEqual(run("add", ...baseArgs("alpha")).code, 0);
  const r = run("add", ...baseArgs("halatia"));
  assert.notEqual(r.code, 0);
  assert.match(r.all, /custom page|already exists/);
  assert.notEqual(run("add", ...baseArgs("Bad Slug")).code, 0);
});

test("feature / unfeature keep numbering dense", () => {
  assert.equal(run("feature", "solene", "2").code, 0);
  assert.deepEqual(["beta", "solene", "alpha"].map((s) => get(s).featured), [1, 2, 3]);
  assert.equal(run("feature", "alpha", "1").code, 0);
  assert.deepEqual(["alpha", "beta", "solene"].map((s) => get(s).featured), [1, 2, 3]);
  assert.equal(run("unfeature", "beta").code, 0);
  assert.equal(get("beta").featured, undefined);
  assert.deepEqual(["alpha", "solene"].map((s) => get(s).featured), [1, 2]);
});

test("hide / unhide, and hiding unfeatures", () => {
  assert.equal(run("hide", "solene").code, 0);
  assert.equal(get("solene").hidden, true);
  assert.equal(get("solene").featured, undefined);
  assert.notEqual(run("feature", "solene", "1").code, 0, "cannot feature hidden");
  assert.match(run("list").out, /solene\s+film\s+yes/);
  assert.equal(run("unhide", "solene").code, 0);
  assert.equal(get("solene").hidden, undefined);
});

test("add-video appends a video with an N-numbered preview and posters", () => {
  const r = run("add-video", "alpha", "--youtube", "https://youtu.be/9bZkp7q19f0?si=zz|Second cut", "--preview", clip2);
  assert.equal(r.code, 0, r.all);
  const p = get("alpha");
  assert.equal(p.videos.length, 2);
  assert.equal(p.videos[1].youtubeId, "9bZkp7q19f0");
  assert.equal(p.videos[1].previewVideo, "/videos/alpha-2-preview.mp4");
  assert.ok(exists("videos", "alpha-2-preview.mp4"));
  assert.ok(exists("videos", "posters", "alpha-2-preview-tiny.webp"));
  assert.notEqual(run("add-video", "alpha", "--youtube", "9bZkp7q19f0").code, 0, "duplicate id rejected");
  assert.match(run("list").out, /alpha\s+film\s+1\s+2\s+alpha-preview\.mp4\s*$/m);
});

test("add with several previews uses <slug>-N-preview.mp4 and --position", () => {
  const r = run("add", ...baseArgs("gamma"), "--youtube", "dQw4w9WgXcQ|One", "--youtube", "9bZkp7q19f0|Two",
    "--preview", clip, "--preview", clip2, "--position", "3");
  assert.equal(r.code, 0, r.all);
  assert.equal(data()[2].slug, "gamma");
  assert.equal(get("gamma").videos[1].previewVideo, "/videos/gamma-2-preview.mp4");
  assert.equal(get("gamma").previewVideo, "/videos/gamma-1-preview.mp4");
});

test("--json input works and flags override it", () => {
  const f = path.join(tmp, "p.json");
  fs.writeFileSync(f, JSON.stringify({
    slug: "delta", title: "Delta", category: "travel", tag: "Cinematography", year: 2024, location: "Lisbon",
    roles: ["Cinematography", "Editing"], description: "Lisbon in spring.", youtube: ["dQw4w9WgXcQ|Delta"], preview: [clip],
  }));
  const r = run("add", "--json", f, "--title", "Delta Override");
  assert.equal(r.code, 0, r.all);
  assert.equal(get("delta").title, "Delta Override");
  assert.equal(get("delta").category, "travel");
  assert.equal(data().findIndex((p) => p.slug === "delta"), data().findIndex((p) => p.category === "travel"), "top of travel group");
});

test("set-preview switches to another clip of the same project (name, /videos/ url, absolute path)", () => {
  assert.equal(get("alpha").previewVideo, "/videos/alpha-preview.mp4");
  const before = hash();
  const dry = run("set-preview", "alpha", "alpha-2-preview.mp4", "--dry-run");
  assert.equal(dry.code, 0, dry.all);
  assert.match(dry.out, /DRY RUN/);
  assert.equal(hash(), before);
  assert.equal(run("set-preview", "alpha", "alpha-2-preview.mp4").code, 0);
  assert.equal(get("alpha").previewVideo, "/videos/alpha-2-preview.mp4");
  assert.equal(run("set-preview", "alpha", "/videos/alpha-preview.mp4").code, 0);
  assert.equal(get("alpha").previewVideo, "/videos/alpha-preview.mp4");
  assert.equal(run("set-preview", "alpha", path.join(root, "public", "videos", "alpha-2-preview.mp4")).code, 0);
  assert.equal(get("alpha").previewVideo, "/videos/alpha-2-preview.mp4");
  assert.equal(run("set-preview", "alpha", "alpha-preview").code, 0, "extension optional");
  assert.equal(get("alpha").previewVideo, "/videos/alpha-preview.mp4");
  assert.match(run("list").out, /alpha\s+film\s+1\s+2\s+alpha-preview\.mp4/);
});

test("set-preview rejects missing files, other projects' clips (unless --force), already-set and unknown slugs", () => {
  const missing = run("set-preview", "alpha", "nope-preview.mp4");
  assert.notEqual(missing.code, 0);
  assert.match(missing.all, /does not exist/);
  const foreign = run("set-preview", "alpha", "gamma-1-preview.mp4");
  assert.notEqual(foreign.code, 0);
  assert.match(foreign.all, /not one of the preview clips/);
  assert.match(foreign.all, /alpha-2-preview\.mp4/, "lists the project's own clips");
  assert.equal(get("alpha").previewVideo, "/videos/alpha-preview.mp4");
  assert.notEqual(run("set-preview", "alpha", "alpha-preview.mp4").code, 0, "already set");
  assert.notEqual(run("set-preview", "nope", "alpha-preview.mp4").code, 0);
  assert.notEqual(run("set-preview", "alpha", "posters/alpha-preview.webp").code, 0);
  assert.equal(run("set-preview", "alpha", "gamma-1-preview.mp4", "--force").code, 0);
  assert.equal(get("alpha").previewVideo, "/videos/gamma-1-preview.mp4");
  assert.equal(run("set-preview", "alpha", "alpha-preview.mp4").code, 0);
});

test("set-thumbnail writes a 2.39:1 WebP (+ tiny), sets the field after coverImage, and replaces on re-run", () => {
  const before = hash();
  assert.equal(run("set-thumbnail", "alpha", still, "--dry-run").code, 0);
  assert.equal(hash(), before);
  assert.ok(!exists("images", "thumbs", "alpha.webp"));
  const r = run("set-thumbnail", "alpha", still);
  assert.equal(r.code, 0, r.all);
  assert.equal(get("alpha").thumbnail, "/images/thumbs/alpha.webp");
  const keys = Object.keys(get("alpha"));
  assert.equal(keys[keys.indexOf("coverImage") + 1], "thumbnail");
  assert.equal(dims(path.join(root, "public", "images", "thumbs", "alpha.webp")), "1280x536");
  assert.ok(exists("images", "thumbs", "alpha-tiny.webp"));
  assert.match(run("list").out, /alpha\s+film\s+1\s+2\s+alpha-preview\.mp4\s+alpha\.webp/);
  assert.equal(run("set-thumbnail", "alpha", still).code, 0, "replacing needs no --force");
  assert.equal(keys.filter((k) => k === "thumbnail").length, 1);
});

test("set-thumbnail --y moves the crop anchor and is validated", () => {
  const big = path.join(root, "public", "images", "thumbs", "alpha.webp");
  assert.equal(run("set-thumbnail", "alpha", still, "--y", "0").code, 0);
  const top = fs.readFileSync(big);
  assert.equal(run("set-thumbnail", "alpha", still, "--y", "1").code, 0);
  assert.ok(!top.equals(fs.readFileSync(big)), "different crop");
  assert.equal(dims(big), "1280x536");
  assert.notEqual(run("set-thumbnail", "alpha", still, "--y", "2").code, 0);
});

test("a failed set-thumbnail keeps the old files and the entry", () => {
  const big = path.join(root, "public", "images", "thumbs", "alpha.webp");
  const old = fs.readFileSync(big);
  const bad = path.join(tmp, "bad.png");
  fs.writeFileSync(bad, "not an image");
  const h = hash();
  const r = run("set-thumbnail", "alpha", bad);
  assert.notEqual(r.code, 0);
  assert.ok(old.equals(fs.readFileSync(big)), "thumbnail restored");
  assert.equal(hash(), h);
  assert.notEqual(run("set-thumbnail", "alpha", path.join(tmp, "missing.png")).code, 0);
  assert.notEqual(run("set-thumbnail", "nope", still).code, 0);
});

const caseArgs = (slug) => [
  "--slug", slug, "--title", "Test Case", "--tag", "Brand Identity", "--year", "2025", "--location", "Paris",
  "--roles", "Art Director,Brand Designer", "--description", "Identity work. Second sentence.",
];

test("add-case --dry-run writes nothing and prints the reminder", () => {
  const before = hash();
  const r = run("add-case", ...caseArgs("case-one"), "--thumbnail", still, "--dry-run");
  assert.equal(r.code, 0, r.all);
  assert.match(r.out, /DRY RUN/);
  assert.match(r.out, /app\/work\/case-one\/page\.tsx/);
  assert.equal(hash(), before);
  assert.ok(!exists("images", "thumbs", "case-one.webp"));
});

test("add-case adds a category other entry at the top of the other group, with thumbnail and reminder", () => {
  const r = run("add-case", ...caseArgs("case-one"), "--thumbnail", still);
  assert.equal(r.code, 0, r.all);
  assert.match(r.out, /REMINDER/);
  assert.match(r.out, /cp app\/work\/halatia\/page\.tsx app\/work\/case-one\/page\.tsx/);
  const p = get("case-one");
  assert.equal(p.category, "other");
  assert.equal(p.thumbnail, "/images/thumbs/case-one.webp");
  assert.equal(p.subtitle, "Brand Identity · Paris");
  assert.equal(p.shortDescription, "Identity work.");
  assert.equal(p.previewVideo, "");
  assert.deepEqual(p.videos, []);
  assert.deepEqual(p.roles, ["Art Director", "Brand Designer"]);
  assert.equal(p.credits.Year, "2025");
  assert.equal(p.credits.Camera, undefined, "no camera defaults on a case study");
  assert.equal(p.featured, undefined);
  assert.equal(data().findIndex((q) => q.slug === "case-one"), data().findIndex((q) => q.category === "other"));
  assert.equal(dims(path.join(root, "public", "images", "thumbs", "case-one.webp")), "1280x536");
  assert.ok(exists("images", "thumbs", "case-one-tiny.webp"));
});

test("add-case validation: duplicate slug, missing thumbnail, video flags, existing page, existing thumb url", () => {
  assert.notEqual(run("add-case", ...caseArgs("case-one"), "--thumbnail", still).code, 0);
  const noThumb = run("add-case", ...caseArgs("case-two"));
  assert.notEqual(noThumb.code, 0);
  assert.match(noThumb.all, /--thumbnail/);
  assert.notEqual(run("add-case", ...caseArgs("case-two"), "--thumbnail", still, "--youtube", "dQw4w9WgXcQ").code, 0);
  assert.notEqual(run("add-case", ...caseArgs("case-two"), "--thumbnail", still, "--category", "film").code, 0);
  fs.mkdirSync(path.join(root, "app", "work", "case-two"), { recursive: true });
  fs.writeFileSync(path.join(root, "app", "work", "case-two", "page.tsx"), "export default function P(){return null}\n");
  const r = run("add-case", ...caseArgs("case-two"), "--thumbnail", "/images/thumbs/case-one.webp");
  assert.equal(r.code, 0, r.all);
  assert.doesNotMatch(r.out, /REMINDER/);
  assert.match(r.out, /already exists/);
  assert.equal(get("case-two").thumbnail, "/images/thumbs/case-one.webp");
  assert.ok(!exists("images", "thumbs", "case-two.webp"), "existing thumb url is used as is");
});

test("remove --delete-media deletes a case's thumbnail pair, but not one another entry still uses", () => {
  assert.equal(run("remove", "case-two", "--delete-media").code, 0);
  assert.ok(exists("images", "thumbs", "case-one.webp"), "still used by case-one");
  assert.equal(run("remove", "case-one", "--delete-media").code, 0);
  assert.ok(!exists("images", "thumbs", "case-one.webp"));
  assert.ok(!exists("images", "thumbs", "case-one-tiny.webp"));
});


// ---- self-hosted full films, aspect, agency, pending, set-youtube, galleries ----
const agencyArgs = ["--agency", "Havas Play|havas-play", "--client", "KFC"];

test("add --full --dry-run probes the film, warns above 40 s, and writes nothing", () => {
  const before = hash();
  const r = run("add", ...baseArgs("film-x"), ...agencyArgs, "--full", `${vertical}|Vertical cut`, "--dry-run");
  assert.equal(r.code, 0, r.all);
  assert.match(r.out, /aspect 9:16/);
  assert.match(r.out, /"agency": \{\s+"name": "Havas Play",\s+"slug": "havas-play"/);
  assert.match(r.out, /\/videos\/full\/film-x-1\.mp4/);
  assert.doesNotMatch(r.out, /WARNING/);
  const long = run("add", ...baseArgs("film-x"), "--full", longFilm, "--dry-run");
  assert.equal(long.code, 0, long.all);
  assert.match(long.out, /WARNING: long\.mp4 is 41 s, over the 40 s rule/);
  assert.match(long.out, /set-youtube/);
  assert.equal(hash(), before);
  assert.ok(!exists("videos", "full", "film-x-1.mp4"));
});

test("add --full encodes into /videos/full, sets hosting/aspect/durationSec, agency and client", () => {
  const r = run("add", ...baseArgs("film-x"), ...agencyArgs, "--full", `${vertical}|Vertical cut`,
    "--full", landscape, "--pending", "Long cut", "--preview", clip);
  assert.equal(r.code, 0, r.all);
  const p = get("film-x");
  assert.deepEqual(p.agency, { name: "Havas Play", slug: "havas-play" });
  assert.equal(p.client, "KFC");
  const keys = Object.keys(p);
  assert.equal(keys[keys.indexOf("location") + 1], "agency");
  assert.equal(keys[keys.indexOf("location") + 2], "client");
  assert.equal(p.videos.length, 3);
  assert.deepEqual(p.videos[0], {
    title: "Vertical cut", youtubeId: "", localVideo: "/videos/full/film-x-1.mp4", previewVideo: "/videos/film-x-preview.mp4",
    hosting: "self", aspect: "9:16", durationSec: 2,
  });
  assert.equal(p.videos[1].title, "Test Film 2");
  assert.equal(p.videos[1].localVideo, "/videos/full/film-x-2.mp4");
  assert.equal(p.videos[1].aspect, "16:9");
  assert.deepEqual(p.videos[2], { title: "Long cut", youtubeId: "", localVideo: "", previewVideo: "", hosting: "youtube", pending: true });
  assert.equal(dims(path.join(root, "public", "videos", "full", "film-x-1.mp4")), "360x640");
  const info = spawnSync(ffmpeg, ["-hide_banner", "-i", path.join(root, "public", "videos", "full", "film-x-1.mp4")], { encoding: "utf8" }).stderr;
  assert.match(info, /Video: h264/);
  assert.match(info, /Audio: aac/);
  assert.match(r.out, /full film: public\/videos\/full\/film-x-1\.mp4/);
});

test("--full caps the long edge at 1920", () => {
  const big = path.join(tmp, "big.mp4");
  makeFilm(big, "2560x1440", 1);
  const r = run("add-video", "film-x", "--full", big);
  assert.equal(r.code, 0, r.all);
  const v = get("film-x").videos[3];
  assert.equal(v.localVideo, "/videos/full/film-x-4.mp4");
  assert.equal(v.aspect, "16:9");
  assert.equal(dims(path.join(root, "public", "videos", "full", "film-x-4.mp4")), "1920x1080");
});

test("--aspect overrides the detected aspect and is validated", () => {
  assert.notEqual(run("add-video", "film-x", "--full", landscape, "--aspect", "2:1").code, 0);
  const r = run("add-video", "film-x", "--full", landscape, "--aspect", "other");
  assert.equal(r.code, 0, r.all);
  const v = get("film-x").videos[4];
  assert.equal(v.aspect, "other");
  assert.equal(v.localVideo, "/videos/full/film-x-5.mp4");
});

test("add-video --pending and --youtube in one call, numbering continues", () => {
  const r = run("add-video", "film-x", "--youtube", "9bZkp7q19f0|On YouTube", "--pending", "Waiting");
  assert.equal(r.code, 0, r.all);
  const vs = get("film-x").videos;
  assert.equal(vs[5].youtubeId, "9bZkp7q19f0");
  assert.equal(vs[6].pending, true);
  assert.notEqual(run("add-video", "film-x").code, 0, "needs a video source");
  assert.notEqual(run("add-video", "film-x", "--pending", "x", "--agency", "A|a").code, 0, "agency is per project");
});

test("list shows the pending count per project", () => {
  const r = run("list");
  assert.match(r.out, /film-x\s+film\s+\d*\s+7\s+2\s/);
  const totalPending = data().reduce((n, p) => n + pendingCount(p), 0);
  assert.ok(totalPending >= 2, "film-x alone has 2 pending");
  assert.match(r.out, new RegExp(`${totalPending} film\\(s\\) waiting for a YouTube upload`));
  assert.doesNotMatch(run("list").out.split("\n").find((l) => /\balpha\b/.test(l)), /pending/);
});

test("set-youtube fills the id by number or title, clears pending, keeps localVideo", () => {
  const before = hash();
  assert.equal(run("set-youtube", "film-x", "3", "https://youtu.be/AAAAAAAAAAA?si=x", "--dry-run").code, 0);
  assert.equal(hash(), before);
  const r = run("set-youtube", "film-x", "3", "https://youtu.be/AAAAAAAAAAA?si=x");
  assert.equal(r.code, 0, r.all);
  assert.match(r.out, /no longer pending/);
  const v = get("film-x").videos[2];
  assert.deepEqual(v, { title: "Long cut", youtubeId: "AAAAAAAAAAA", localVideo: "", previewVideo: "", hosting: "youtube" });
  assert.equal(pendingCount(get("film-x")), 1);
  // by title (case-insensitive fragment), on a self-hosted film: localVideo stays
  assert.equal(run("set-youtube", "film-x", "vertical", "https://www.youtube.com/watch?v=BBBBBBBBBBB").code, 0);
  const w = get("film-x").videos[0];
  assert.equal(w.youtubeId, "BBBBBBBBBBB");
  assert.equal(w.localVideo, "/videos/full/film-x-1.mp4");
  assert.equal(w.hosting, "self");
  // pending title
  assert.equal(run("set-youtube", "film-x", "Waiting", "CCCCCCCCCCC").code, 0);
  assert.equal(pendingCount(get("film-x")), 0);
  assert.equal(get("film-x").videos[6].pending, undefined);
  // the copied data has pending films of its own: only the total must have dropped by film-x's 2
  const left = data().reduce((n, p) => n + pendingCount(p), 0);
  const out = run("list").out;
  if (left) assert.match(out, new RegExp(`${left} film\\(s\\) waiting for a YouTube upload`));
  else assert.doesNotMatch(out, /waiting for a YouTube upload/);
  assert.doesNotMatch(out.split("\n").find((l) => /\bfilm-x\b/.test(l)), /\s2\s+film-x-preview/);
});

test("set-youtube refuses duplicates, silent overwrites, unknown videos and bad links", () => {
  assert.match(run("set-youtube", "film-x", "1", "AAAAAAAAAAA").all, /already uses/);
  assert.match(run("set-youtube", "film-x", "1", "DDDDDDDDDDD").all, /already has YouTube id BBBBBBBBBBB/);
  assert.equal(run("set-youtube", "film-x", "1", "DDDDDDDDDDD", "--force").code, 0);
  assert.equal(get("film-x").videos[0].youtubeId, "DDDDDDDDDDD");
  const amb = run("set-youtube", "film-x", "Test Film", "EEEEEEEEEEE");
  assert.notEqual(amb.code, 0);
  assert.match(amb.all, /More than one video/);
  assert.match(amb.all, /1\. Vertical cut/);
  assert.notEqual(run("set-youtube", "film-x", "99", "EEEEEEEEEEE").code, 0);
  assert.notEqual(run("set-youtube", "film-x", "2", "https://example.com/x").code, 0);
  assert.notEqual(run("set-youtube", "nope", "1", "EEEEEEEEEEE").code, 0);
});

test("a failed --full encode leaves no partial state", () => {
  const before = hash();
  const bad = path.join(tmp, "bad-film.mp4");
  fs.writeFileSync(bad, "not a video");
  assert.notEqual(run("add-video", "film-x", "--full", bad).code, 0);
  assert.equal(hash(), before);
  assert.notEqual(run("add", ...baseArgs("broken-full"), "--full", bad).code, 0);
  assert.equal(hash(), before);
});

test("add-gallery converts to WebP (<= 1600 wide), records size, merges by title, places galleries before credits", () => {
  const before = hash();
  assert.equal(run("add-gallery", "film-x", "--title", "Stills", "--image", still, "--dry-run").code, 0);
  assert.equal(hash(), before);
  const r = run("add-gallery", "film-x", "--title", "Stills", "--image", still, "--image", still2);
  assert.equal(r.code, 0, r.all);
  const p = get("film-x");
  assert.deepEqual(p.galleries, [{ title: "Stills", images: [
    { path: "/images/film-x/my-still-01.webp", width: 800, height: 600 },
    { path: "/images/film-x/second.webp", width: 1600, height: 800 },
  ] }]);
  const keys = Object.keys(p);
  assert.equal(keys[keys.indexOf("credits") - 1], "galleries");
  assert.equal(dims(path.join(root, "public", "images", "film-x", "second.webp")), "1600x800");
  // same title again: appended, name made unique; another title: second gallery
  assert.equal(run("add-gallery", "film-x", "--title", "stills", "--image", still).code, 0);
  assert.equal(get("film-x").galleries.length, 1);
  assert.equal(get("film-x").galleries[0].images[2].path, "/images/film-x/my-still-01-2.webp");
  assert.equal(run("add-gallery", "film-x", "--title", "Behind the scenes", "--image", still2).code, 0);
  assert.equal(get("film-x").galleries.length, 2);
  assert.notEqual(run("add-gallery", "film-x", "--image", still).code, 0, "title required");
  assert.notEqual(run("add-gallery", "film-x", "--title", "T").code, 0, "image required");
  assert.notEqual(run("add-gallery", "nope", "--title", "T", "--image", still).code, 0);
});

test("a failed add-gallery leaves no files and no entry", () => {
  const before = hash();
  const bad = path.join(tmp, "bad-img.png");
  fs.writeFileSync(bad, "not an image");
  const filesBefore = fs.readdirSync(path.join(root, "public", "images", "film-x")).sort();
  assert.notEqual(run("add-gallery", "film-x", "--title", "Broken", "--image", still2, "--image", bad).code, 0);
  assert.equal(hash(), before);
  assert.deepEqual(fs.readdirSync(path.join(root, "public", "images", "film-x")).sort(), filesBefore);
});

test("remove --delete-media also deletes full films and gallery images", () => {
  assert.ok(exists("videos", "full", "film-x-1.mp4"));
  assert.equal(run("remove", "film-x", "--delete-media").code, 0);
  assert.equal(get("film-x"), undefined);
  assert.ok(!exists("videos", "full", "film-x-1.mp4"));
  assert.ok(!exists("images", "film-x", "second.webp"));
  assert.ok(!exists("videos", "film-x-preview.mp4"));
});

// ---- optimize-media integration, with a stub that records how it is called ----
function stubRoot(name, withThumb, imageMode) {
  const r0 = path.join(tmp, name);
  fs.mkdirSync(path.join(r0, "data"), { recursive: true });
  fs.mkdirSync(path.join(r0, "public", "videos"), { recursive: true });
  fs.mkdirSync(path.join(r0, "scripts"), { recursive: true });
  fs.copyFileSync(path.join(REPO, "data", "projects.json"), path.join(r0, "data", "projects.json"));
  fs.writeFileSync(path.join(r0, "scripts", "optimize-media.mjs"), `
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const a = process.argv.slice(2);
fs.appendFileSync(path.join(root, "calls.log"), a.join(" ") + "\\n");
${imageMode ? `if (a[0] === "image") {
  ${imageMode === "fail" ? "console.error('image command broken'); process.exit(1);" : "fs.mkdirSync(path.dirname(a[2]), { recursive: true }); fs.copyFileSync(a[1], a[2]); process.exit(0);"}
}` : ""}
${withThumb ? `if (a[0] === "thumb") {
  const d = path.join(root, "public", "images", "thumbs"); fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, a[2] + ".webp"), "stub"); fs.writeFileSync(path.join(d, a[2] + "-tiny.webp"), "stub");
  process.exit(0);
}` : ""}
const base = path.basename(a[0], ".mp4"); const d = path.join(root, "public", "videos", "posters"); fs.mkdirSync(d, { recursive: true });
fs.writeFileSync(path.join(d, base + ".webp"), "stub"); fs.writeFileSync(path.join(d, base + "-tiny.webp"), "stub");
`);
  return r0;
}
const calls = (r0) => fs.readFileSync(path.join(r0, "calls.log"), "utf8").trim().split("\n").map((l) => l.replaceAll(r0 + path.sep, ""));

test("add --preview delegates to scripts/optimize-media.mjs when the repo has it", () => {
  const r0 = stubRoot("stub-site", true);
  const r = runIn(r0, "add", ...baseArgs("omega"), "--youtube", "dQw4w9WgXcQ|Omega", "--preview", clip);
  assert.equal(r.code, 0, r.all);
  assert.deepEqual(calls(r0), ["public/videos/omega-preview.mp4"]);
  assert.ok(fs.existsSync(path.join(r0, "public", "videos", "omega-preview.mp4")), "raw clip was copied for the optimizer to process");
  assert.ok(fs.existsSync(path.join(r0, "public", "videos", "posters", "omega-preview-tiny.webp")));
  assert.equal(JSON.parse(fs.readFileSync(path.join(r0, "data", "projects.json"), "utf8")).projects.find((p) => p.slug === "omega").previewVideo, "/videos/omega-preview.mp4");
});

test("set-thumbnail and add-case call `optimize-media thumb <src> <slug>` when it supports it", () => {
  const r0 = stubRoot("stub-site-thumb", true);
  const r = runIn(r0, "set-thumbnail", "halatia", still);
  assert.equal(r.code, 0, r.all);
  assert.deepEqual(calls(r0), [`thumb ${still} halatia`]);
  assert.equal(runIn(r0, "set-thumbnail", "halatia", still, "--y", "0.2").code, 0);
  assert.equal(calls(r0)[1], `thumb ${still} halatia --y 0.2`);
  assert.equal(JSON.parse(fs.readFileSync(path.join(r0, "data", "projects.json"), "utf8")).projects.find((p) => p.slug === "halatia").thumbnail, "/images/thumbs/halatia.webp");
  const c = runIn(r0, "add-case", ...caseArgs("case-x"), "--thumbnail", still);
  assert.equal(c.code, 0, c.all);
  assert.equal(calls(r0)[2], `thumb ${still} case-x`);
});

test("an optimize-media without a thumb command falls back to the embedded ffmpeg thumbnail", () => {
  const r0 = stubRoot("stub-site-nothumb", false);
  const r = runIn(r0, "set-thumbnail", "halatia", still);
  assert.equal(r.code, 0, r.all);
  assert.ok(!fs.existsSync(path.join(r0, "calls.log")), "stub not called");
  assert.equal(dims(path.join(r0, "public", "images", "thumbs", "halatia.webp")), "1280x536");
});


test("add-gallery calls `optimize-media image <src> <out>` when it has one, and falls back to ffmpeg when that fails", () => {
  const r0 = stubRoot("stub-site-image", true, "ok");
  const r = runIn(r0, "add-gallery", "halatia", "--title", "Stills", "--image", still);
  assert.equal(r.code, 0, r.all);
  assert.deepEqual(calls(r0), [`image ${still} ${path.join(r0, "public", "images", "halatia", "my-still-01.webp")}`.replaceAll(r0 + path.sep, "")]);
  const g = JSON.parse(fs.readFileSync(path.join(r0, "data", "projects.json"), "utf8")).projects.find((p) => p.slug === "halatia").galleries;
  assert.equal(g[0].images[0].path, "/images/halatia/my-still-01.webp");
  const r1 = stubRoot("stub-site-image-fail", true, "fail");
  const f = runIn(r1, "add-gallery", "halatia", "--title", "Stills", "--image", still);
  assert.equal(f.code, 0, f.all);
  assert.match(f.out, /using the embedded ffmpeg/);
  assert.equal(dims(path.join(r1, "public", "images", "halatia", "my-still-01.webp")), "800x600");
  const r2 = stubRoot("stub-site-noimage", true);
  assert.equal(runIn(r2, "add-gallery", "halatia", "--title", "Stills", "--image", still).code, 0);
  assert.ok(!fs.existsSync(path.join(r2, "calls.log")), "no image command: stub not called");
});

test("move reorders", () => {
  assert.equal(run("move", "delta", "1").code, 0);
  assert.equal(data()[0].slug, "delta");
});

test("failed add leaves no partial state", () => {
  const before = hash();
  const bad = path.join(tmp, "bad.mp4");
  fs.writeFileSync(bad, "not a video");
  const r = run("add", ...baseArgs("broken"), "--youtube", "dQw4w9WgXcQ|B", "--preview", bad);
  assert.notEqual(r.code, 0);
  assert.equal(hash(), before);
  assert.ok(!exists("videos", "broken-preview.mp4"));
});

test("remove --delete-media removes entry and its files, renumbers featured", () => {
  assert.equal(run("remove", "beta", "--delete-media").code, 0);
  assert.equal(get("beta"), undefined);
  assert.ok(!exists("videos", "beta-preview.mp4"));
  assert.ok(!exists("videos", "posters", "beta-preview.webp"));
  assert.ok(exists("videos", "alpha-preview.mp4"), "other project media untouched");
});

test("projects.json is still valid and well-formed after everything", () => {
  const raw = fs.readFileSync(dataFile, "utf8");
  const parsed = JSON.parse(raw);
  assert.equal(serialize(parsed) + "\n", raw);
  const slugs = parsed.projects.map((p) => p.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  const f = parsed.projects.filter((p) => p.featured != null).map((p) => p.featured).sort();
  assert.deepEqual(f, f.map((_, i) => i + 1), "featured is dense 1..N");
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed} tests passed${process.exitCode ? ", with failures" : ""}`);
