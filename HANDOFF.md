# Remi Karlin Portfolio: Session Handoff

Paste or attach this file at the start of a new session. It covers what a new session needs to keep editing the site without re-discovering everything.

Last updated: 2026-10-08 · Last commit when written: `1246ef1`

---

## 1. Who / what

- **Owner:** Remi Karlin, filmmaker, cinematographer and artistic director (Hong Kong / Paris). Use "artistic director", not "creative director", in site copy.
- **Site:** Personal portfolio, live at **remikarlin.com**
- **Audience:** film producers, art directors, agencies. Goal: understand Remi's creative direction and the vibe of the work, then keep exploring and come away impressed.
- **Personality:** cinematic, precise, understated. Video does the talking and the UI stays out of the way.

## 2. Stack and deploy

| Thing | Value |
|---|---|
| Framework | Next.js 14.2 (App Router) + TypeScript + React 18 |
| Styling | Mostly `app/globals.css` plus inline styles. Tailwind is installed but barely used |
| Animation | framer-motion is installed, but page transitions were **removed** on purpose |
| Font | Nohemi variable (100–900), self-hosted in `public/fonts` |
| Repo | `github.com/remiiiiiiiiiiii/remi-karlin-portfolio`, branch `main` |
| Deploy | Vercel auto-deploys on push to `main` |
| Local path | `/Users/remikarlin/Downloads/claude portfolio remi` |
| Dev | `npm run dev` → http://localhost:3000 |

**Workflow Remi uses:** make the change → (optionally) preview on local dev → commit → `git push` → Vercel deploys. Remi usually says "push this" when happy.

## 3. Security note (important)

- The git remote URL has a **GitHub personal access token embedded** in `.git/config`. Never print it, echo it, or paste it into chat or a file.
- An older token was exposed in chat earlier and Remi was told to revoke it. If a push fails with an auth error, the token was probably rotated. Ask Remi to generate a new one and update the remote himself, or switch to `gh auth login` / the macOS keychain credential helper (the better long-term fix).
- Don't send Remi's email to any external service.

## 4. Project structure

```
app/
  page.tsx                  Homepage: full-frame hero, bio, then ONE work index (see below)
  layout.tsx                Root layout (Nav, Cursor, ScrollRoot, PageTransition)
  globals.css               All design tokens + most styles
  about/page.tsx
  work/[slug]/page.tsx      Generic project page for every video project in projects.json
  work/halatia/             Custom case-study pages (category "other"). Same for
  work/unfold-agency/       unfold-agency, the-outfiters, b1nbags-process,
  work/the-outfiters/       ruinarktefact-process. A custom folder beats [slug].
  work/b1nbags-process/
  work/ruinarktefact-process/
components/
  HeroFrame.tsx             Desktop hero: full-frame clip + hover list of featured projects
  FeaturedGrid.tsx          Mobile poster grid (same featured order)
  Bio.tsx                   Homepage bio block
  WorkIndex.tsx             The single index with Films / Travel / Case studies filters
  PreviewVideo.tsx, playback.ts   Poster-first preview playback (see §7)
  CyclingVideo.tsx, ProjectVideo.tsx (YouTube facade), PhotoCarousel.tsx, PhotoGallery.tsx   Project pages
  Nav, Cursor, BackButton, ScrollRoot, ScrollReveal, Footer, PageTransition (passthrough)
lib/projects.ts, lib/posters.ts   Types + helpers over projects.json (featured / hidden / preview selection)
data/
  projects.json             THE source of truth for every listed project
  *-images.json             Pre-generated image path lists for the custom pages
public/
  videos/                   Preview clips (+ posters/) and some local full videos
  images/<folder>/          Images per project (folder names use hyphens, never spaces)
  images/thumbs/            <slug>.webp + <slug>-tiny.webp: 2.39:1 index stills for case studies
scripts/                    add-project.mjs (content CLI), optimize-media.mjs (media rules), tests
PRODUCT.md, DESIGN.md, .impeccable/design.json   Design context docs (impeccable skill)
```

**Homepage in one paragraph.** Desktop: a full-frame hero whose hover list is the `featured` projects (in `featured` order); it plays that project's `previewVideo`, one clip at a time. Mobile: no video, a static poster grid in the same order. Below the bio sits a single work index with filters Films (`category: film`), Travel (`travel`) and Case studies (`other`). `/video-work` and `/other-work` are gone (redirects). `hidden` = not listed and noindex; the page still opens by URL.

## 5. Adding / editing content

Moved to **[docs/CONTENT.md](docs/CONTENT.md)**: how the homepage picks what it shows, the five-step recipe for a video project, the case-study recipe, `set-preview` / `set-thumbnail` / `add-case`, reorder and hide, regenerating posters, the schema. In a Claude Code session in `~/OS`, the `portfolio-add-work` skill drives this from a single request. Pushing to `main` deploys.

## 6. Current content state

`node scripts/add-project.mjs list` is the live truth (slug, category, featured, hidden, clip, thumbnail). At the time of writing, 19 entries:

- **Featured (hero / grid order):** fan-yan, solene, hong-kong, b1nbags, ruinarktefact, modessec.
- **Hidden:** vietnam (own page, not listed).
- **Case studies (`other`, each with `thumbnail` and a custom page):** halatia, unfold-agency, the-outfiters, b1nbags-process, ruinarktefact-process.

| Slug | Category | Notes |
|---|---|---|
| fan-yan | film | Mini doc on HK artist + Lamps film + product photo carousel |
| solene | film | Music video, **cover of "12:51" by The Strokes**, filmed in **Philadelphia**, 2025. YT `5-u9BV25JG8` |
| hong-kong | travel | 5 videos (compilation, Lantau, Cliff, Junk, SSP/Mong Kok). Hero clip is the SSP one; swap with `set-preview` |
| france | travel | Chamonix, Sanary-sur-Mer, Avignon (YT `gOAvKEz_shI`) |
| spain / morocco / amsterdam / vietnam | travel | Single videos |
| venice | travel | 2025, YT `1JtN6NCqXWo` |
| new-york | travel | 2025, YT `sgVeARSI2pg`, preview file is `newyork-preview.mp4` |
| b1nbags | film | Brand videos only (Teaser, Vol.2, Shot Expresso). Brand/design assets live on the **b1nbags-process** case study |
| modessec / rmx | film | ESSEC association events |
| ruinarktefact | film | Campaign films. Mascot/campaign assets live on the **ruinarktefact-process** case study |
| halatia, unfold-agency, the-outfiters, b1nbags-process, ruinarktefact-process | other | Custom pages under `app/work/`. Thumbnails are `/images/thumbs/<slug>.webp`. the-outfiters carries a `previewVideo` that is not in a `videos[]`, so `set-preview` on it needs `--force` |

**Descriptions for venice / new-york are placeholder-ish** (written by Claude, short). Remi may want to rewrite them.

## 7. Technical gotchas (learned the hard way)

- **Scroll happens inside `#scrollRoot`** (`position: fixed; overflow-y: auto`), not the window. Any scroll listener must target `document.getElementById("scrollRoot")`.
- **Nav:** turns solid via an IntersectionObserver on `#top-sentinel` inside `#scrollRoot`; the Work link scrolls `#work` inside `#scrollRoot`.
- **Nav flash on load:** fixed with `visible` state (false → true after 50ms) driving inline opacity. CSS-only / `<head>` style approaches failed with Next streaming. Don't "simplify" it back.
- **Cursor:** starts hidden and shows on the **first `mousemove`** (not `mouseenter`), snapping to position to avoid drift.
- **Page transitions were removed** on purpose (Remi said they made the site feel slow). Keep navigation instant.
- **Folder names with spaces break image URLs.** Always hyphenate.
- After CSS changes, a stale browser cache can show a black screen. Hard refresh (Cmd+Shift+R).
- **Hero plays one clip at a time, desktop only.** Mobile is a static poster grid. Preview clips go through `components/PreviewVideo.tsx`: a WebP poster (`/videos/posters/<name>.webp`) and a video `src` set only while a clip is meant to play or pre-warm. Never go back to `preload="auto"` on all clips, and never add a second playing video to the hero. Each featured project plays all of its `getPreviewVideos()` clips in turn (flat clip index in `HeroFrame`; each clip is its own layer; `data-project`/`data-clip`/`data-src` on `.hero-d` for testing).
- **Never run `next build` while `next dev` is running.** It corrupts `.next`. If that happens: stop the dev server, delete `.next`, restart. For checks use `npx tsc --noEmit`.
- **Dev server for the Claude desktop app:** the `portfolio` configuration in `/Users/remikarlin/OS/.claude/launch.json` (`npm --prefix` this repo, `run dev`, port 3000). Outside the app, `npm run dev`.
- **Poster, thumbnail and clip rules live in `scripts/optimize-media.mjs`** (letterbox crop, luma-based poster frame, `thumb` for 2.39:1 stills). `add-project.mjs` calls it; do not reimplement them elsewhere. After replacing a clip file: `npm run media -- --force-posters public/videos/<name>-preview.mp4`.
- Case-study pages need both the `projects.json` entry (with `thumbnail`) and a folder under `app/work/`. `add-case` does the first and prints how to do the second.

## 8. Design system (summary; full detail in DESIGN.md)

- Tokens: `--bg #000`, `--text #fff`, `--text-2 #888`, `--accent #620c0a` (cinnabar, the only accent), `--ease cubic-bezier(0.16,1,0.3,1)`
- Rules: one accent colour only; no tinted greys; heavy weights get tight tracking and light weights get wide tracking; small labels are ALL CAPS with wide letter-spacing (~0.16–0.26em, 9px); flat by default (no shadows/blur).
- Motion (Emil Kowalski principles applied): strong ease-out, 200–250ms for UI, ~400ms for reveals, hover effects inside `@media (hover: hover) and (pointer: fine)`, `prefers-reduced-motion` respected, `:active` states on interactive items, `:focus-visible` uses the accent outline.

## 9. How Remi likes to work

- Asks Claude to **ask clarifying questions** before bigger changes. Do that and offer multiple-choice options.
- Likes short replies: what changed plus anything assumed.
- Often says "show this in local dev" before "push this".
- Commit messages end with the `Co-Authored-By` line from the session's attribution instructions.

## 10. Loose ends / ideas

- Venice + New York descriptions could be richer (ask Remi for specifics).
- Untracked files in the repo root: `public/images/b1nbags process.pdf`, `public/images/ruinarktefact process.pdf` (source PDFs, already converted), `stop-slop/`, `PRODUCT.md`, `DESIGN.md`, `.impeccable/`. These were never committed; decide whether to commit or `.gitignore` them.
- Loose root-level images in `public/images/` (e.g. `Mascotte finale (1).png`, `banner b1nbags.png`) look like originals. Check before deleting.
- Consider moving git auth off the embedded token (see §3).
