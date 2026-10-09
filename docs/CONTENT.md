# Adding and editing content

Everything for video projects lives in `data/projects.json`. You do not edit code to add, feature, hide or reorder a project: one script does it all (`scripts/add-project.mjs`, also `npm run add-project -- ...`).

## The recipe (3 steps)

1. **Gather**: YouTube link(s), title, category (`film` / `travel` / `other`), tag, year, location, roles, a short paragraph, the preview clip (any length or size) and, optionally, stills. New preview sources usually sit in `/Users/remikarlin/remi-portfolio/public/video previews/` (`mdfind -name clip.mp4` finds them fast).
2. **Run the script** (add `--dry-run` first to see the plan without writing anything):

   ```bash
   node scripts/add-project.mjs --slug solene --title "Solène" --category film --tag "Music Video" \
     --year 2025 --location "Philadelphia" --roles "Direction,Cinematography,Editing,Colour" \
     --description "..." --short "..." \
     --youtube "https://youtu.be/5-u9BV25JG8?si=x|Solène: 12:51 cover" \
     --preview "/path/to/clip.mp4" --featured 3
   ```

   It parses the YouTube id, encodes the preview (8 s, no audio, max 1280 px, H.264 CRF 28) and its two posters, converts stills to WebP, inserts the entry, renumbers `featured`, checks that the JSON still parses, and prints the git diff stat.
3. **Check, commit, deploy**: `npx tsc --noEmit`, `npm run dev` and open `/work/<slug>`, then commit and `npm run deploy` (= `git push origin main`; Vercel builds from there). The script never commits or pushes.

For a long list of values, put them in a file and run `node scripts/add-project.mjs --json project.json` (same keys as the flags; flags override the file).

## Other commands

| Command | What it does |
|---|---|
| `list` | Table of slug, category, featured, hidden, number of videos |
| `feature <slug> <n>` | Make it the n-th tile on the landing (1 = first). Others shift, numbering stays 1..N |
| `unfeature <slug>` | Take it off the landing; the rest renumber |
| `hide <slug>` / `unhide <slug>` | Hide from every list while the page `/work/<slug>` keeps working. Hiding also unfeatures |
| `add-video <slug> --youtube "URL\|title" [--preview file]` | Append a video (and its preview clip, named `<slug>-N-preview.mp4`) to an existing project |
| `move <slug> <position>` | Reorder in `projects.json` (1 = very first). The array order sets the order on /video-work and the prev/next links |
| `remove <slug> [--delete-media]` | Delete the entry; with the flag, also the preview, posters and images no other project uses |

Every command accepts `--dry-run`. The script is covered by `node scripts/add-project.test.mjs` (runs on a temp copy, touches nothing real).

## `add` options

`--slug` (lowercase, hyphens), `--title`, `--category`, `--tag`, `--year` (`2025` or `2024–25`), `--description` are required. Optional: `--subtitle` (default "tag · location"), `--short` (default: first sentence of the description), `--location`, `--roles` (comma list; `Direction`/`Director`, `Cinematography`, `Editing`, `Colour`/`Color` are mapped to both forms), `--credit "Camera=Sony A7"` (repeatable; overrides default credits), `--youtube "URL|title"` (repeatable; any URL form, `?si=` dropped), `--preview file` (repeatable, matched to `--youtube` in order), `--image file` (repeatable), `--featured N`, `--position N` (default: top of its category group), `--force` (overwrite existing media), `--root dir`.

Preview naming: one preview becomes `public/videos/<slug>-preview.mp4`, several become `<slug>-1-preview.mp4`, `<slug>-2-preview.mp4`... Posters go to `public/videos/posters/<preview-basename>.webp` and `...-tiny.webp`. Stills go to `public/images/<slug>/<name>.webp`; the first becomes `coverImage` and all go in `photoGrid`.

## Schema reference (`data/projects.json` → `{ "projects": [ ... ] }`)

| Field | Type | Notes |
|---|---|---|
| `slug` | string | URL id: `/work/<slug>`. Unique; must not clash with a custom page folder in `app/work/` |
| `title` | string | Display name |
| `subtitle` | string | Line under the title, e.g. `Music video · 12:51 cover · The Strokes` |
| `shortDescription` | string | One sentence for tiles/rows |
| `tag` | string | Short type label, e.g. `Music Video`, `Documentary`, `Cinematography` |
| `category` | `film` \| `travel` \| `other` | Decides the section on /video-work (`other` projects have custom pages) |
| `year` | string | `"2025"` or `"2024–25"` |
| `location` | string | |
| `roles` | string[] | Person nouns: `Director`, `Cinematographer`, `Editor`, `Colorist` |
| `description` | string | The paragraph on the project page |
| `previewVideo` | string | `/videos/<slug>-preview.mp4`, the main looping clip |
| `coverImage` | string | `/images/...` or `""` |
| `featured` | number, optional | Landing position, 1 = first tile. Absent = not on the landing. Always dense 1..N (the script maintains it) |
| `hidden` | boolean, optional | `true` = not listed anywhere (landing, video-work), page still reachable by URL. Absent = visible |
| `videos` | array | Each `{ title, youtubeId, localVideo, previewVideo, description? }`. `localVideo` is `""` when only on YouTube; `previewVideo` is `""` if none |
| `credits` | object | Free key/value shown on the page: `Year`, `Location`, `Roles` (activity nouns joined with ` · `), `Camera`, `Lens`, `Post`. Defaults: Camera `Lumix S5II`, Lens `Lumix 20–60mm f/3.5–5.6`, Post `DaVinci Resolve` |
| `photoGrid` | `{ title, images[] }`, optional | Stills gallery |
| `instagram`, `instagramUrl`, `bannerImage`, `instagramGridImage`, `campaignBody`, `mascotImage`, `campaignDesignImage` | strings, optional | Used by the campaign-style pages (ruinarktefact). Not set by the script; edit by hand |

Array order matters: it sets the order on /video-work and the prev/next links.

## How featured and hidden behave

- **Landing page**: the "Selected Projects" tiles are the projects with `featured`, ordered by it. The hero strips take their clips from the featured projects too (falling back to a built-in list when there are fewer than 3 clips).
- **Hidden**: kept in the file, absent from every listing, page still opens at `/work/<slug>`. Use it for work in progress or work you want to pull without deleting.
- `feature` on a number already taken inserts and shifts the others down; there are no gaps.

## Removing a project

Reversible way: `node scripts/add-project.mjs hide <slug>`.
Permanent: `node scripts/add-project.mjs remove <slug> --delete-media` (use `--dry-run` first). It drops the entry, renumbers `featured`, and deletes the preview, posters and images only if no other project uses them. Custom pages under `app/work/<slug>/` and hand-written links elsewhere are not touched.

## Other Work pages (brand / process)

These are not in `projects.json` and still need code.

1. Put images in `public/images/<hyphenated-folder>/` (never spaces in folder names).
2. Create `data/<name>-images.json` (array of paths). Do not use `fs.readdirSync`: it pushed the Vercel function past the 300MB limit before.
3. Copy `app/work/halatia/page.tsx` (brand) or `app/work/b1nbags-process/page.tsx` (process) as the template.
4. Add an entry to the array in `app/other-work/page.tsx` (`href`, `category`, `title`, `subtitle`, `description`, `year`).
5. PDFs to slides: pymupdf (`fitz`) at 2.5x zoom gives ~3600x2025 JPG at 92% quality. Run `npm run media` afterwards to optimise.
