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

const run = (...args) => {
  const r = spawnSync("node", [CLI, "--root", root, ...args], { encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr, all: r.stdout + r.stderr };
};
const data = () => JSON.parse(fs.readFileSync(dataFile, "utf8")).projects;
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

test("list prints the table", () => {
  const r = run("list");
  assert.equal(r.code, 0);
  assert.match(r.out, /slug\s+category\s+featured\s+hidden\s+videos/);
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
  assert.equal(ps.length, 17);
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
  assert.match(run("list").out, /alpha\s+film\s+1\s+2\s*$/m);
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
