# Adding and editing content

Everything the site lists lives in `data/projects.json`. You do not edit code to add, feature, hide, reorder or re-pick a clip: one script does it all (`scripts/add-project.mjs`, also `npm run add-project -- ...`). Add `--dry-run` to any command to see the plan without writing anything.

## What the homepage shows, and where each piece comes from

1. **Hero (desktop)**: a full-frame video with a hover list of the featured projects. The list is the projects that have `featured`, in `featured` order (1 = first). Hovering or selecting a row plays that project's `previewVideo`, one clip at a time. This is desktop only.
2. **Poster grid (mobile)**: the same featured projects, same order, as static posters. Nothing plays.
3. **Bio**: text on the page, not in `projects.json`.
4. **Work index**: every project that is not `hidden`, with three filters:

   | Filter | Shows | Note |
   |---|---|---|
   | Films | `category: "film"` | |
   | Travel | `category: "travel"` | |
   | Case studies | `category: "other"` | Custom pages under `app/work/<slug>/`. Each needs a `thumbnail` |

   Order inside a filter is the order in `projects.json` (change it with `move`). The still of a video project is the poster of its `previewVideo`, unless the entry has a `thumbnail`, which wins. Case studies have no clip, so their still is always `thumbnail`.

`/video-work` and `/other-work` no longer exist (they redirect; the work index is on the homepage).

**Which clip plays for a project** is its `previewVideo`. A project with several videos has one preview clip per video (`videos[].previewVideo`); `previewVideo` is the one chosen to represent it. To switch to another clip:

```bash
node scripts/add-project.mjs list                                  # the preview column shows the current clip
node scripts/add-project.mjs set-preview hong-kong hong-kong-cliff-preview.mp4
```

The file must exist in `public/videos` and be one of that project's own video previews (the error lists them). `--force` allows any clip in `public/videos`. Posters belong to the clip file, so they follow automatically.

## Recipe: new video project (5 steps)

1. **Gather**: YouTube link(s) with a title each, project title, category (`film` / `travel`), tag, year, location, roles, a short paragraph, the preview source clip (any length or size), optional stills. Preview sources usually sit in `/Users/remikarlin/remi-portfolio/public/video previews/` (`mdfind -name clip.mp4` finds them).
2. **Dry run**:

   ```bash
   node scripts/add-project.mjs --slug solene --title "Solène" --category film --tag "Music Video" \
     --year 2025 --location "Philadelphia" --roles "Direction,Cinematography,Editing,Colour" \
     --description "..." --short "..." \
     --youtube "https://youtu.be/5-u9BV25JG8?si=x|Solène: 12:51 cover" \
     --preview "/path/to/clip.mp4" --featured 3 --dry-run
   ```

3. **Run it** (same command without `--dry-run`). It parses the YouTube id, runs the preview through `scripts/optimize-media.mjs` (8 s, no audio, max 1280 px, letterbox bars cropped, poster frame picked by brightness, tiny poster), converts stills to WebP, inserts the entry at the top of its category, renumbers `featured`, checks the JSON re-parses, and prints the git diff stat. Leave out `--featured` if it should not be on the homepage hero.
4. **Check locally**: `npx tsc --noEmit`, then the dev server (in the Claude desktop app: the "portfolio" entry in `/Users/remikarlin/OS/.claude/launch.json`; otherwise `npm run dev`). Open `/`, hover the hero row (desktop width), check the index under Films/Travel, and open `/work/<slug>`. Never run `next build` while the dev server is running: it corrupts `.next`.
5. **Commit and push**: commit `data` and `public` (not `git add -A`), then `npm run deploy` (= `git push origin main`). **Pushing to `main` deploys** to remikarlin.com through Vercel, so push only when you mean to ship. The scripts never commit or push.

For long values put them in a file and run `node scripts/add-project.mjs --json project.json` (same keys as the flags; flags override the file).

## Recipe: new case study (category `other`)

Case studies are brand or process pages with their own code. Three parts: the entry, the thumbnail, the page.

1. **Entry and thumbnail** in one command (`--thumbnail` is any image; it is cropped to 2.39:1, 1280x536, and written to `public/images/thumbs/<slug>.webp` plus `<slug>-tiny.webp`):

   ```bash
   node scripts/add-project.mjs add-case --slug acme-identity --title "Acme" --tag "Brand Identity" \
     --year 2025 --location "Paris" --roles "Art Director,Brand Designer" \
     --description "..." --short "..." --thumbnail "/path/to/hero.jpg" --dry-run
   ```

   `--y 0..1` moves the crop up or down (0 top, 1 bottom, default centre). The script prints a reminder of step 2.
2. **The page**: copy a template and edit it.

   ```bash
   mkdir -p app/work/acme-identity
   cp app/work/halatia/page.tsx app/work/acme-identity/page.tsx          # brand identity
   cp app/work/b1nbags-process/page.tsx app/work/acme-identity/page.tsx # process / slides
   ```

   Put images in `public/images/acme-identity/` (hyphens, never spaces), list them in `data/acme-identity-images.json` (an array of paths; do not use `fs.readdirSync`, it pushed the Vercel function past the 300MB limit), then run `npm run media` to optimise. PDFs to slides: pymupdf (`fitz`) at 2.5x zoom gives about 3600x2025 JPG at 92% quality.
3. Check locally and push as in steps 4 and 5 above. The index card links to `/work/<slug>`, so the page must exist before you push.

Change a thumbnail later: `node scripts/add-project.mjs set-thumbnail halatia /path/to/new.jpg` (replaces the file, same URL). It also works on a video project to override the clip poster in the index.

## Reorder, feature, hide

| Command | What it does |
|---|---|
| `list` | Table of slug, category, featured, hidden, videos, preview clip, thumbnail |
| `feature <slug> <n>` | Make it the n-th item in the hero list and mobile grid (1 = first). Others shift, numbering stays 1..N |
| `unfeature <slug>` | Take it off the hero; the rest renumber |
| `hide <slug>` / `unhide <slug>` | Not listed anywhere (hero, grid, index) and `noindex`, while `/work/<slug>` keeps working. Hiding also unfeatures |
| `move <slug> <position>` | Reorder in `projects.json` (1 = very first). Sets the order inside each index filter and the prev/next links |
| `set-preview <slug> <file>` | Pick which existing clip represents the project (see above) |
| `set-thumbnail <slug> <image>` | New index still, 2.39:1 WebP |
| `add-video <slug> --youtube "URL\|title" [--preview file]` | Append a video (and its clip, named `<slug>-N-preview.mp4`) to an existing project |
| `add-case ...` | New case study entry (see recipe) |
| `remove <slug> [--delete-media]` | Delete the entry; with the flag also the clip, posters, thumbnail and images no other project uses |

A project only works in the hero if it has a `previewVideo`. Reversible way to pull something: `hide`. Permanent: `remove --delete-media` (dry run first). Custom pages under `app/work/<slug>/` and hand-written links are not touched by `remove`.

## Swapping a clip: regenerate its poster

Posters are made when a clip is added and are kept afterwards. If you replace the mp4 itself (same file name), refresh the encode and the poster:

```bash
npm run media -- --force-posters public/videos/<name>-preview.mp4
# or, to re-encode from the full-quality original(s) in a folder:
npm run media -- --from "/path/to/originals" --force-posters
```

Choosing a different existing clip with `set-preview` needs none of this. `npm run media` alone (or with `--all`) only fills in what is missing and is safe to repeat; `--dry` reports without writing.

## `add` options

`--slug` (lowercase, hyphens), `--title`, `--category`, `--tag`, `--year` (`2025` or `2024–25`), `--description` are required. Optional: `--subtitle` (default "tag · location"), `--short` (default: first sentence of the description), `--location`, `--roles` (comma list; `Direction`/`Director`, `Cinematography`, `Editing`, `Colour`/`Color` are mapped to both forms), `--credit "Camera=Sony A7"` (repeatable; overrides default credits), `--youtube "URL|title"` (repeatable; any URL form, `?si=` dropped), `--preview file` (repeatable, matched to `--youtube` in order), `--image file` (repeatable), `--thumbnail image` (index still override), `--featured N`, `--position N` (default: top of its category group), `--force` (overwrite existing media), `--root dir`.

Preview naming: one preview becomes `public/videos/<slug>-preview.mp4`, several become `<slug>-1-preview.mp4`, `<slug>-2-preview.mp4`... Posters go to `public/videos/posters/<preview-basename>.webp` and `...-tiny.webp`. Stills go to `public/images/<slug>/<name>.webp`; the first becomes `coverImage` and all go in `photoGrid`.

## Schema reference (`data/projects.json` → `{ "projects": [ ... ] }`)

| Field | Type | Notes |
|---|---|---|
| `slug` | string | URL id: `/work/<slug>`. Unique; must not clash with a custom page folder in `app/work/` (except for case studies, which are meant to have one) |
| `title` | string | Display name |
| `subtitle` | string | Line under the title, e.g. `Music video · 12:51 cover · The Strokes` |
| `shortDescription` | string | One sentence for index rows and cards |
| `tag` | string | Short type label, e.g. `Music Video`, `Documentary`, `Brand Identity` |
| `category` | `film` \| `travel` \| `other` | Index filter: Films / Travel / Case studies |
| `year` | string | `"2025"` or `"2024–25"` |
| `location` | string | |
| `roles` | string[] | Person nouns: `Director`, `Cinematographer`, `Editor`, `Colorist` |
| `description` | string | The paragraph on the project page |
| `previewVideo` | string | `/videos/<name>-preview.mp4`: the clip the hero plays and the source of the poster. `""` for case studies |
| `coverImage` | string | `/images/...` or `""` |
| `thumbnail` | string, optional | `/images/thumbs/<slug>.webp` (2.39:1, 1280x536, with a `-tiny.webp` sibling). Required for `category: "other"`; on a video project it overrides the poster in the index. Sits right after `coverImage` |
| `featured` | number, optional | Position in the hero list and mobile grid, 1 = first. Absent = not featured. Always dense 1..N (the script maintains it) |
| `hidden` | boolean, optional | `true` = not listed, `noindex`, page still reachable by URL. Absent or `false` = visible |
| `videos` | array | Each `{ title, youtubeId, localVideo, previewVideo, description? }`. `localVideo` is `""` when only on YouTube; `previewVideo` is `""` if none. Case studies: `[]` |
| `credits` | object | Free key/value shown on the page: `Year`, `Location`, `Roles` (activity nouns joined with ` · `), `Camera`, `Lens`, `Post`. Video defaults: Camera `Lumix S5II`, Lens `Lumix 20–60mm f/3.5–5.6`, Post `DaVinci Resolve`. `add-case` adds no camera defaults |
| `photoGrid` | `{ title, images[] }`, optional | Stills gallery |
| `instagram`, `instagramUrl`, `bannerImage`, `instagramGridImage`, `campaignBody`, `mascotImage`, `campaignDesignImage` | strings, optional | Used by the campaign-style pages. Not set by the script; edit by hand |

Array order matters: it sets the order inside each index filter and the prev/next links.

## Tests

`node scripts/add-project.test.mjs` runs everything on a temp copy and touches nothing real. Run it after any change in `scripts/`.
