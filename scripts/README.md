# scripts/

Node 24, no dependencies. ffmpeg is found at `$FFMPEG`, `/Users/remikarlin/.local/bin/ffmpeg`, or on `PATH`.

| File | Purpose |
|---|---|
| `add-project.mjs` | Add / feature / hide / move / remove projects and add videos. `npm run add-project -- help` |
| `add-project.test.mjs` | Tests for the above on a temp copy of the repo skeleton (`node scripts/add-project.test.mjs`) |
| `optimize-media.mjs` | Re-encode previews, posters and images under `public/` (`npm run media`) |
| `lib/args.mjs` | Flag parser and `UserError` |
| `lib/youtube.mjs` | YouTube id from any URL form, `"URL\|title"` specs |
| `lib/media.mjs` | ffmpeg wrappers: preview, posters (1280 + 24 px), image to WebP |
| `lib/store.mjs` | Load / save `data/projects.json` (keeps the file's formatting, re-parses after writing) |
| `lib/ops.mjs` | Pure data operations: build entry, featured renumbering, hide, move, list |

Recipe and schema: `docs/CONTENT.md`. The scripts never commit or push. `--root <dir>` (or `PORTFOLIO_ROOT`) points them at another copy of the repo; the tests use that.
