# Remi Karlin Portfolio: Session Handoff

Paste or attach this file at the start of a new session. It covers what a new session needs to keep editing the site without re-discovering everything.

Last updated: 2026-10-08 · Last commit: `092ee33`

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
  page.tsx                  Homepage: <Hero/> strips + "Selected Projects" tiles (LANDING_ORDER) + About
  layout.tsx                Root layout (Nav, Cursor, ScrollRoot, PageTransition)
  globals.css               All design tokens + most styles
  about/page.tsx
  video-work/page.tsx       All video work, split into film + travel by `category`
  other-work/page.tsx       Hardcoded list of brand/process pages + "Photography: Coming soon"
  work/[slug]/page.tsx      Generic project page for everything in projects.json
  work/halatia/             Custom brand identity page
  work/unfold-agency/       Custom brand identity page (same format as halatia)
  work/the-outfiters/       Custom art direction page
  work/b1nbags-process/     Custom process page (3 PDF slides + brand assets)
  work/ruinarktefact-process/ Custom process page (3 PDF slides + campaign carousel)
components/
  Hero.tsx         3 vertical video strips cycling preview clips (STRIP_SOURCES, hardcoded)
  CyclingVideo.tsx A/B crossfading preview loop used on project hero
  ProjectTiles.tsx Homepage tiles
  VideoWorkClient.tsx  Video-work page rows with hover previews
  PreviewVideo.tsx (poster + on-demand clip), playback.ts, landing-data.ts (featured/hidden), ProjectVideo.tsx (YouTube facade), PhotoCarousel.tsx, PhotoGallery.tsx
  Nav.tsx          Nav with section memory (see §7)
  Cursor.tsx       Custom dot + ring cursor
  BackButton.tsx   router.back(), styled by .back-btn in CSS
  ScrollRoot.tsx   #scrollRoot fixed scroll container
  ScrollReveal.tsx, Footer.tsx (© 2026), PageTransition.tsx (now a passthrough)
lib/projects.ts    Types + getPreviewVideos(project)
data/
  projects.json    THE source of truth for video projects
  *-images.json    Pre-generated image path lists for custom pages
public/
  videos/          All preview clips + some local full videos
  images/<folder>/ Images per project (folder names use hyphens, never spaces)
PRODUCT.md, DESIGN.md, .impeccable/design.json   Design context docs (impeccable skill)
```

## 5. Adding / editing content

Moved to **[docs/CONTENT.md](docs/CONTENT.md)**: the 3-step recipe (`node scripts/add-project.mjs ...`), the `featured` / `hidden` flags, the full schema, removing projects, and the Other Work (brand / process) page recipe. In a Claude Code session in `~/OS`, the `portfolio-add-work` skill drives this from a single request.

## 6. Current content state

**Homepage "Selected Projects" (`LANDING_ORDER`):**
fan-yan → solene → hong-kong → b1nbags → modessec → rmx → ruinarktefact → spain
(Vietnam was deliberately removed from here but still has its own page and is on the video-work page.)

**projects.json order:** fan-yan, solene, hong-kong, france, spain, morocco, amsterdam, vietnam, venice, new-york, b1nbags, halatia, the-outfiters, modessec, rmx, ruinarktefact

| Slug | Category | Notes |
|---|---|---|
| fan-yan | film | Mini doc on HK artist + Lamps film + product photo carousel |
| solene | film | Music video, **cover of "12:51" by The Strokes**, filmed in **Philadelphia**, 2025. YT `5-u9BV25JG8` |
| hong-kong | travel | 5 videos (compilation, Lantau, Cliff, Junk, SSP/Mong Kok) |
| france | travel | Chamonix, Sanary-sur-Mer, Avignon (YT `gOAvKEz_shI`) |
| spain / morocco / amsterdam / vietnam | travel | Single videos |
| venice | travel | 2025, YT `1JtN6NCqXWo` |
| new-york | travel | 2025, YT `sgVeARSI2pg`, preview file is `newyork-preview.mp4` |
| b1nbags | film | Brand videos only (Teaser, Vol.2, Shot Expresso). Brand/design assets live on the **B1NBAGS Process** page, not here |
| modessec / rmx | film | ESSEC association events |
| ruinarktefact | film | Campaign films. Mascot/campaign assets live on the **Ruinarktefact Process** page |
| halatia / the-outfiters | other | Have custom pages under `app/work/` |

**Other Work page lists:** Halatia, Unfold Agency, The Outfiters, B1NBAGS Process, Ruinarktefact Process, then "Photography: Coming soon".

**Descriptions for venice / new-york are placeholder-ish** (written by Claude, short). Remi may want to rewrite them.

## 7. Technical gotchas (learned the hard way)

- **Scroll happens inside `#scrollRoot`** (`position: fixed; overflow-y: auto`), not the window. Any scroll listener must target `document.getElementById("scrollRoot")`.
- **Nav section memory:** all project pages live under `/work/...`, so `Nav.tsx` stores the last non-project path in `sessionStorage["nav-section"]` and uses it for the active state on project pages. Keep this when touching nav.
- **Nav flash on load:** fixed with `visible` state (false → true after 50ms) driving inline opacity. CSS-only / `<head>` style approaches failed with Next streaming. Don't "simplify" it back.
- **Mobile dropdown:** `.nav-mobile-dropdown` must be `display:none` in base CSS and only `display:block` inside the mobile media query, or it shows on desktop.
- **Cursor:** starts hidden and shows on the **first `mousemove`** (not `mouseenter`), snapping to position to avoid drift.
- **Page transitions were removed** on purpose (Remi said they made the site feel slow). Keep navigation instant.
- **Folder names with spaces break image URLs.** Always hyphenate.
- After CSS changes, a stale browser cache can show a black screen. Hard refresh (Cmd+Shift+R).
- Preview clips: `components/PreviewVideo.tsx` shows a WebP poster (`/videos/posters/<name>.webp`) and only sets the video `src` while a clip is meant to play or pre-warm. Hero plays 3 clips max, tiles 2 max. Never go back to `preload="auto"` on all clips.

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
- "Photography: Coming soon" on Other Work is still a placeholder.
- Untracked files in the repo root: `public/images/b1nbags process.pdf`, `public/images/ruinarktefact process.pdf` (source PDFs, already converted), `stop-slop/`, `PRODUCT.md`, `DESIGN.md`, `.impeccable/`. These were never committed; decide whether to commit or `.gitignore` them.
- Loose root-level images in `public/images/` (e.g. `Mascotte finale (1).png`, `banner b1nbags.png`) look like originals. Check before deleting.
- Consider moving git auth off the embedded token (see §3).
