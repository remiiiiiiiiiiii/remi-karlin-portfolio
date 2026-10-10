# Adding and editing content

Everything the site lists lives in `data/projects.json`. You do not edit code to add, feature, hide, reorder or re-pick a clip: one script does it all (`scripts/add-project.mjs`, also `npm run add-project -- ...`). Add `--dry-run` to any command to see the plan without writing anything.

## What the homepage shows, and where each piece comes from

1. **Hero (desktop)**: a full-frame video with a hover list of the featured projects. The list is the projects that have `featured`, in `featured` order (1 = first). Hovering or selecting a row plays that project's clips one after the other (`heroClips` when set, else its `previewVideo` first and then the other landscape clips). A hub can be featured too: the Travel hub cycles its `heroClips`; the Havas Play hub does the same and its row shows the client pages in brackets, revealed while the row is current or hovered. This is desktop only.
2. **Poster grid (mobile)**: the same featured projects, same order, as static 16:9 stills: the entry's `poster` when set, else the poster of its `previewVideo`. Nothing plays.
3. **Bio**: text on the page, not in `projects.json`.
4. **Work index**: every project that is not `hidden` (travel destinations excepted, see the table), with two filters:

   | Filter | Shows | Note |
   |---|---|---|
   | Films | `category: "film"`, plus the Travel and Havas Play hubs | Travel destinations (`category: "travel"`, no `custom`) and agency work (entries with `agency`) are not listed: they live on `/work/travel` and `/work/havas-play` |
   | Case studies | `category: "other"` | Custom pages under `app/work/<slug>/`. Each needs a `thumbnail` |

   A project with `hub` set (e.g. `"hub": "brand-identity"`) is reached through its hub page and is not listed in the index; the hub is listed instead, under the group of its first child. A hub's children show in brackets on its hero row when the hub is featured.

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
4. **Check locally**: `npx tsc --noEmit`, then the dev server (in the Claude desktop app: the "portfolio" entry in `/Users/remikarlin/OS/.claude/launch.json`; otherwise `npm run dev`). Open `/`, hover the hero row (desktop width), check the index under Films/Case studies, and open `/work/<slug>`. Never run `next build` while the dev server is running: it corrupts `.next`.
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

## Agency work and the Havas hub

Work made for an agency is a normal project entry with two extra fields: `agency: { name, slug }` and `client`. The hub is a custom page (`app/work/havas-play/`, listed itself as a case-study entry). It lists every visible project whose `agency.slug` is `havas-play`, ordered by `order` in `data/havas-copy.json`; a client without an `order` goes after the numbered ones, in `projects.json` order. The client page is the generic `/work/<slug>` page and links back to the hub through `agency`. So: set `agency` and the client shows up on the hub, nothing else to wire.

**Add a new client page** (slug `havas-<client>`; never `havas-play`, which is the hub):

```bash
node scripts/add-project.mjs --slug havas-nissan --title "Nissan" --category film --tag "Agency" \
  --year 2026 --location "Paris" --roles "Editing,Art direction" \
  --agency "Havas Play|havas-play" --client "Nissan" \
  --description "..." --short "..." \
  --full "/path/nissan-30s.mp4|Nissan, 30 s" --pending "Nissan, long cut" \
  --preview "/path/nissan-clip.mp4" --dry-run
```

- A film of 40 s or less goes on the site: `--full` encodes it to `public/videos/full/<slug>-<n>.mp4` (H.264 CRF 26, long edge 1920, AAC 128k, faststart) and sets `localVideo`, `hosting: "self"`, `aspect` and `durationSec` from the file. Above 40 s the script warns: upload to YouTube instead.
- A longer film: add it as `--pending "Title"` (shows the poster with "Full film coming soon"), then send the file to YouTube.
- `--client` and `--agency` are only for `add` / `add-case`. Optional: add the slug to `clients` in `data/havas-copy.json` to fix its position on the hub and give it hub copy.

**Fill the YouTube ids of pending films** once Rémi has uploaded them:

```bash
node scripts/add-project.mjs list                      # "pending" column = films still waiting, per project
node scripts/add-project.mjs set-youtube havas-renault 1 "https://youtu.be/XXXXXXXXXXX"
node scripts/add-project.mjs set-youtube havas-sanofi "Mikkel" "https://youtu.be/YYYYYYYYYYY"   # or by title
```

The video is `n` (1-based, order on the page) or a title / fragment of one. It sets `youtubeId`, removes `pending`, and keeps `localVideo` if there is one. An id that is already set needs `--force`. After a pending film gets its id the facade appears, no other change. The importer `scripts/import-havas.mjs` builds entries from its manifest; do not re-run it to fill ids, use `set-youtube`.

Add a film to an existing client: `add-video <slug> --full "file.mp4|title"` (or `--youtube "URL|title"`, or `--pending "Title"`); previews go through `--preview`.

**Add galleries** (stills, boards, behind the scenes) to any project:

```bash
node scripts/add-project.mjs add-gallery havas-kfc --title "Stills" --image a.jpg --image b.png
```

Each image becomes a WebP with a long edge of at most 1600 px in `public/images/<slug>/`, and `{ path, width, height }` is appended to the gallery with that title (a new `galleries[]` entry if the title is new). Use another `--title` for a second gallery. Conversion uses `optimize-media image` when that command exists, otherwise the embedded ffmpeg.

## Vertical and square films

`aspect` on a video entry (`9:16`, `16:9`, `1:1`, `4:5`, `3:2`, `other`) tells the page how big to draw the player. `--full` reads it from the file with ffprobe (within 4 % of a named ratio, else `other`); override with `--aspect` on `add` / `add-video`. On the project page:

| `aspect` | Player |
|---|---|
| `16:9`, `other`, unset | Full-width 16:9 player, as before |
| `9:16`, `4:5` | Portrait box at that ratio, at most 80 vh tall |
| `1:1` | Square box, at most 720 px wide, centred |
| `3:2` | 3:2 box at full width |

The poster of a pending film uses the same box. When the first clip of a project is vertical, the project hero puts the clip on the right and keeps the text on the left. Mixed formats on one project are fine: each video has its own `aspect`. `durationSec` and `variants` (other cuts such as `["6s", "10s"]`, shown as "Also cut as ...") appear in the video caption when present; `durationSec` is set by `--full`, `variants` by hand in `projects.json`.

## Reorder, feature, hide

| Command | What it does |
|---|---|
| `list` | Table of slug, category, featured, hidden, videos, pending (films waiting for YouTube), preview clip, thumbnail |
| `feature <slug> <n>` | Make it the n-th item in the hero list and mobile grid (1 = first). Others shift, numbering stays 1..N |
| `unfeature <slug>` | Take it off the hero; the rest renumber |
| `hide <slug>` / `unhide <slug>` | Not listed anywhere (hero, grid, index) and `noindex`, while `/work/<slug>` keeps working. Hiding also unfeatures |
| `move <slug> <position>` | Reorder in `projects.json` (1 = very first). Sets the order inside each index filter and the prev/next links |
| `set-preview <slug> <file>` | Pick which existing clip represents the project (see above) |
| `set-thumbnail <slug> <image>` | New index still, 2.39:1 WebP (for both banners from a film frame, see `pick-frames`) |
| `add-video <slug> --youtube "URL\|title" [--preview file]` | Append a video (and its clip, named `<slug>-N-preview.mp4`) to an existing project. Also takes `--full "file\|title"` and `--pending "Title"`, `--aspect` |
| `set-youtube <slug> <n\|title> <url>` | Fill the YouTube id of a (pending) video; keeps `localVideo` |
| `add-gallery <slug> --title T --image f...` | WebP images into `public/images/<slug>/`, appended to `galleries[]` |
| `add-case ...` | New case study entry (see recipe) |
| `remove <slug> [--delete-media]` | Delete the entry; with the flag also the clip, posters, thumbnail and images no other project uses |

A project only works in the hero if it has a `previewVideo`. Reversible way to pull something: `hide`. Permanent: `remove --delete-media` (dry run first). Custom pages under `app/work/<slug>/` and hand-written links are not touched by `remove`.

## Choosing the landing banners from real frames

The banner of a project is two stills made from one chosen frame: `thumbnail` (2.39:1, the work index) and `poster` (16:9, the phone grid). The desktop hero is not a still, it plays the clips. `scripts/pick-frames.mjs` proposes frames so nobody has to scrub each film:

```bash
npm run pick-frames -- sheet                 # every featured project; or: sheet fan-yan hong-kong
npm run pick-frames -- apply fan-yan 4 havas-kfc 6 --dry-run
npm run pick-frames -- apply fan-yan 4 havas-kfc 6
```

`sheet` finds the shots of each film (ffmpeg scene detection; the full local files behind the hero clips when they are on disk, else the preview clips; `--previews` forces the clips), takes one candidate frame per shot away from the cuts, scores them for exposure, contrast, sharpness and colour, drops near-duplicates (perceptual hash) and keeps the best `--count` (default 20, Rémi's choice) spread over the films. It writes `.frames/<slug>/sheet.jpg`: the candidates numbered, each at the 2.39:1 crop with the film name and timestamp. `--scene 0.2` finds more cuts in films with soft transitions. Send the sheets to Rémi, he answers with numbers.

`apply <slug> <n>` re-reads that frame at full quality and writes `public/images/thumbs/<slug>.webp`, `<slug>-16x9.webp` and their `-tiny.webp`, then sets `thumbnail` and `poster`. `--y 0..1` moves the crop up or down (0.5 centre). For a frame that is not on the sheet: `apply <slug> --source /path/film.mp4 --at 12.5` (an image works too, without `--at`). `.frames/` is git-ignored; the thumbs and `data/projects.json` are what gets committed.

## Swapping a clip: regenerate its poster

Posters are made when a clip is added and are kept afterwards. If you replace the mp4 itself (same file name), refresh the encode and the poster:

```bash
npm run media -- --force-posters public/videos/<name>-preview.mp4
# or, to re-encode from the full-quality original(s) in a folder:
npm run media -- --from "/path/to/originals" --force-posters
```

Choosing a different existing clip with `set-preview` needs none of this. `npm run media` alone (or with `--all`) only fills in what is missing and is safe to repeat; `--dry` reports without writing.

## `add` options

`--slug` (lowercase, hyphens), `--title`, `--category`, `--tag`, `--year` (`2025` or `2024–25`), `--description` are required. Optional: `--subtitle` (default "tag · location"), `--short` (default: first sentence of the description), `--location`, `--roles` (comma list; `Direction`/`Director`, `Cinematography`, `Editing`, `Colour`/`Color` are mapped to both forms), `--credit "Camera=Sony A7"` (repeatable; overrides default credits), `--youtube "URL|title"` (repeatable; any URL form, `?si=` dropped), `--preview file` (repeatable, matched to `--youtube` in order), `--image file` (repeatable), `--thumbnail image` (index still override), `--full "film.mp4|title"` (repeatable; self-hosted full film, see the Havas section), `--pending "Title"` (repeatable; film awaiting YouTube), `--aspect 9:16|16:9|1:1|4:5|3:2|other`, `--agency "Name|slug"`, `--client "Name"`, `--featured N`, `--position N` (default: top of its category group), `--force` (overwrite existing media), `--root dir`.

Preview naming: one preview becomes `public/videos/<slug>-preview.mp4`, several become `<slug>-1-preview.mp4`, `<slug>-2-preview.mp4`... Posters go to `public/videos/posters/<preview-basename>.webp` and `...-tiny.webp`. Stills go to `public/images/<slug>/<name>.webp`; the first becomes `coverImage` and all go in `photoGrid`. Videos are listed in this order: `--youtube`, `--full`, `--pending`; `--preview` clips pair with them in that order. Full films are numbered by their place in `videos[]`: `public/videos/full/<slug>-<n>.mp4`.

## Schema reference (`data/projects.json` → `{ "projects": [ ... ] }`)

| Field | Type | Notes |
|---|---|---|
| `slug` | string | URL id: `/work/<slug>`. Unique; must not clash with a custom page folder in `app/work/` (except for case studies, which are meant to have one) |
| `title` | string | Display name |
| `subtitle` | string | Line under the title, e.g. `Music video · 12:51 cover · The Strokes` |
| `shortDescription` | string | One sentence for index rows and cards |
| `tag` | string | Short type label, e.g. `Music Video`, `Documentary`, `Brand Identity` |
| `category` | `film` \| `travel` \| `other` | Index filter: Films (travel = hub only) / Case studies |
| `year` | string | `"2025"` or `"2024–25"` |
| `location` | string | |
| `roles` | string[] | Person nouns: `Director`, `Cinematographer`, `Editor`, `Colorist` |
| `description` | string | The paragraph on the project page |
| `previewVideo` | string | `/videos/<name>-preview.mp4`: the clip the hero plays and the source of the poster. `""` for case studies |
| `coverImage` | string | `/images/...` or `""` |
| `thumbnail` | string, optional | `/images/thumbs/<slug>.webp` (2.39:1, 1280x536, with a `-tiny.webp` sibling). Required for `category: "other"`; on a video project it overrides the poster in the index. Sits right after `coverImage` |
| `featured` | number, optional | Position in the hero list and mobile grid, 1 = first. Absent = not featured. Always dense 1..N (the script maintains it) |
| `hidden` | boolean, optional | `true` = not listed, `noindex`, page still reachable by URL. Absent or `false` = visible |
| `videos` | array | Each `{ title, youtubeId, localVideo, previewVideo, description?, hosting?, aspect?, pending?, variants?, durationSec? }`. `localVideo` is `""` when only on YouTube; `previewVideo` is `""` if none. Case studies: `[]`. New fields: `hosting` `"self"` (native player on `localVideo`, `/videos/full/<slug>-<n>.mp4`) or `"youtube"`; `aspect` (see above); `pending: true` while `hosting` is `"youtube"` and `youtubeId` is `""`; `variants` string[]; `durationSec` number |
| `credits` | object | Free key/value shown on the page: `Year`, `Location`, `Roles` (activity nouns joined with ` · `), `Camera`, `Lens`, `Post`. Video defaults: Camera `Lumix S5II`, Lens `Lumix 20–60mm f/3.5–5.6`, Post `DaVinci Resolve`. `add-case` adds no camera defaults |
| `photoGrid` | `{ title, images[] }`, optional | Stills gallery |
| `galleries` | `[{ title, images: [{ path, width?, height? }] }]`, optional | Titled galleries, made by `add-gallery`; sits just before `credits` |
| `agency` | `{ name, slug }`, optional | Agency the work was made for, e.g. `{ "name": "Havas Play", "slug": "havas-play" }`. `slug` is the hub page `/work/<slug>`; the hub lists every project with this slug. Sits after `location` |
| `client` | string, optional | Brand the work was made for, e.g. `KFC`. Sits after `agency` |
| `instagram`, `instagramUrl`, `bannerImage`, `instagramGridImage`, `campaignBody`, `mascotImage`, `campaignDesignImage` | strings, optional | Used by the campaign-style pages. Not set by the script; edit by hand |

Array order matters: it sets the order inside each index filter and the prev/next links.

## Tests

`node scripts/add-project.test.mjs` runs everything on a temp copy and touches nothing real. Run it after any change in `scripts/`.

## Mood board snapshot (The Outfiters)

The Outfiters page shows a picture of the whole Milanote board first (the read-only Milanote view opens at 100% on an empty corner of a board that size) and the live board on request. After editing the board, refresh the picture:

```bash
npm run moodboard -- "https://app.milanote.com/<board id>?p=<read-only token>" public/images/the-outfiters/moodboard.webp
```

It photographs the board in tiles with headless Chrome (one browser per tile, a shared cache), stitches them and writes a 2400 px WebP plus a `-tiny.webp`. About 10 minutes. Then update `MOODBOARD_SNAPSHOT.height` in `app/work/the-outfiters/page.tsx` if the printed height changed, and commit `public/images/the-outfiters/`.
