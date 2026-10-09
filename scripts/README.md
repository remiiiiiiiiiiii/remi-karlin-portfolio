# scripts/

Node 24, no dependencies. ffmpeg is found at `$FFMPEG`, `/Users/remikarlin/.local/bin/ffmpeg`, or on `PATH`.

| File | Purpose |
|---|---|
| `add-project.mjs` | Add / feature / hide / move / remove projects, add videos, pick the hero clip (`set-preview`), set index thumbnails (`set-thumbnail`), add case studies (`add-case`). `npm run add-project -- help` |
| `add-project.test.mjs` | Tests for the above on a temp copy of the repo skeleton (`node scripts/add-project.test.mjs`) |
| `optimize-media.mjs` | Owns the media rules: re-encode previews (letterbox crop, luma-based poster frame), images to WebP, `thumb <src> <slug>` for 2.39:1 case-study thumbnails (`npm run media`) |
| `lib/args.mjs` | Flag parser and `UserError` |
| `lib/youtube.mjs` | YouTube id from any URL form, `"URL\|title"` specs |
| `lib/media.mjs` | ffmpeg fallbacks (preview, posters, image to WebP, 2.39:1 thumbnail) and the hook that runs `optimize-media.mjs` |
| `lib/store.mjs` | Load / save `data/projects.json` (keeps the file's formatting, re-parses after writing) |
| `lib/ops.mjs` | Pure data operations: build entries, featured renumbering, hide, move, list |

`add-project.mjs` hands previews (`--preview`) and thumbnails (`set-thumbnail`, `add-case`) to `scripts/optimize-media.mjs` when it exists in the repo, so the poster and crop rules live in one place. If the file is missing, or has no `thumb` command, it falls back to the embedded ffmpeg commands in `lib/media.mjs` (no letterbox crop, poster at 1 s).

Recipes and schema: `docs/CONTENT.md`. The scripts never commit or push. `--root <dir>` (or `PORTFOLIO_ROOT`) points them at another copy of the repo; the tests use that.
