# scripts/

Node 24, no dependencies. ffmpeg is found at `$FFMPEG`, `/Users/remikarlin/.local/bin/ffmpeg`, or on `PATH`; ffprobe the same way (`$FFPROBE`, then next to ffmpeg), with ffmpeg's banner as the fallback.

| File | Purpose |
|---|---|
| `add-project.mjs` | Add / feature / hide / move / remove projects, add videos, pick the hero clip (`set-preview`), set index thumbnails (`set-thumbnail`), add case studies (`add-case`), self-hosted full films (`--full`), pending YouTube films (`--pending`, `set-youtube`), galleries (`add-gallery`), agency / client fields (`--agency`, `--client`). `npm run add-project -- help` |
| `add-project.test.mjs` | Tests for the above on a temp copy of the repo skeleton (`node scripts/add-project.test.mjs`) |
| `optimize-media.mjs` | Owns the media rules: re-encode previews (letterbox crop, luma-based poster frame), images to WebP, `thumb <src> <slug>` for 2.39:1 case-study thumbnails (`npm run media`). Never touches `public/videos/full/` |
| `lib/args.mjs` | Flag parser and `UserError` |
| `lib/youtube.mjs` | YouTube id from any URL form, `"URL\|title"` specs |
| `lib/media.mjs` | ffmpeg / ffprobe helpers (probe, preview, posters, full film, image to WebP, 2.39:1 thumbnail) and the hook that runs `optimize-media.mjs` |
| `lib/store.mjs` | Load / save `data/projects.json` (keeps the file's formatting, re-parses after writing) |
| `lib/ops.mjs` | Pure data operations: build entries, aspect detection, agency parsing, pending count, featured renumbering, hide, move, list |

`add-project.mjs` hands previews (`--preview`) and thumbnails (`set-thumbnail`, `add-case`) to `scripts/optimize-media.mjs` when it exists in the repo, so the poster and crop rules live in one place. If the file is missing, or has no `thumb` command, it falls back to the embedded ffmpeg commands in `lib/media.mjs` (no letterbox crop, poster at 1 s). `add-gallery` calls `optimize-media.mjs image <src> <out>` when the script has an `image` command (and falls back to ffmpeg if it fails or is absent). Full films (`--full`) are always encoded by `lib/media.mjs`: H.264 CRF 26, long edge 1920, AAC 128k, faststart, into `public/videos/full/<slug>-<n>.mp4`; the rule is 40 s or less self-hosted, longer on YouTube.

Recipes and schema: `docs/CONTENT.md`. The scripts never commit or push. `--root <dir>` (or `PORTFOLIO_ROOT`) points them at another copy of the repo; the tests use that.
