---
name: Remi Karlin Portfolio
description: Filmmaker, cinematographer, and artistic director portfolio — where restraint is the loudest signal.
colors:
  accent: "#620c0a"
  black: "#000000"
  white: "#ffffff"
  ash: "#888888"
  charcoal: "#333333"
  ghost-line: "#FFFFFF12"
  ghost-line-hover: "#FFFFFF1F"
  ghost-line-soft: "#FFFFFF0F"
typography:
  display:
    fontFamily: "Nohemi, Inter Tight, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "clamp(80px, 14vw, 200px)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Nohemi, Inter Tight, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "clamp(48px, 8vw, 96px)"
    fontWeight: 800
    lineHeight: 0.88
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Nohemi, Inter Tight, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Nohemi, Inter Tight, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 300
    lineHeight: 1.8
  label:
    fontFamily: "Nohemi, Inter Tight, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "9px"
    fontWeight: 300
    letterSpacing: "0.16em"
rounded:
  none: "0px"
  pill: "999px"
spacing:
  pad-x: "48px"
  section: "96px"
  content-md: "48px"
  content-sm: "24px"
components:
  nav-link:
    textColor: "{colors.white}"
    typography: "{typography.label}"
  nav-link-active:
    textColor: "{colors.white}"
    typography: "{typography.label}"
  back-button:
    backgroundColor: "transparent"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
---

# Design System: Remi Karlin Portfolio

## 1. Overview

**Creative North Star: "The Director's Cut"**

Everything that doesn't serve the scene is cut. This design system operates like a film editor working on a final cut — each element earns its place through function and weight, not decoration. The result is a site that communicates taste before a single word is read: jet black, precisely spaced, with a single blood-dark accent that appears only when it earns the screen.

The system is built on Nohemi, a variable font that moves between ultra-thin labels and 800-weight display type across a single family. This range is the whole typographic toolkit — no secondary typeface is needed because the weight spectrum provides all the contrast required. Every size, every weight, and every spacing value is a deliberate compositional choice.

Darkness here is not absence — it is the frame. The black background is the unlit stage before the work appears. Content emerges from it; it does not sit on top of it.

**Key Characteristics:**
- Single-font system (Nohemi variable, weights 100–900)
- Zero-tolerance for decoration: no gradients, no shadows, no border-radius except the back button pill
- One accent colour (#620c0a) used at ≤10% of any surface — its rarity is its power
- Motion is earned: transitions at 200–250ms (UI), 400ms (scroll reveals), strong ease-out only
- Full-bleed video as the primary visual language; imagery takes precedence over any UI element

## 2. Colors: The Unlit Frame

A palette of absolute economy — near-black, near-white, three grey midtones, and one deep accent.

### Primary
- **Deep Cinnabar** (`#620c0a`): The single accent. Used on active nav underlines, text selection highlights, and accent details. Never backgrounds. Never more than a sliver of any screen. Its scarcity is the point.

### Neutral
- **Absolute Black** (`#000000`): The canvas. Every page background. The frame before the image.
- **Clean White** (`#ffffff`): Primary text and all UI elements that must read immediately.
- **Ash** (`#888888`): Secondary text — descriptions, meta information, credits. Readable but subordinate.
- **Charcoal** (`#333333`): Dim text — tags, faint labels, decorative UI text. Barely there.
- **Ghost Line** (`#FFFFFF12`): Dividers and borders. Nearly invisible; structural without weight.
- **Ghost Line Hover** (`#FFFFFF1F`): Elevated state for dividers on interaction.
- **Ghost Line Soft** (`#FFFFFF0F`): The softest separator — section edges on hero backgrounds.

### Named Rules
**The One Voice Rule.** Deep Cinnabar appears on ≤10% of any given screen. It marks active state and selection — nothing else. Expanding it to backgrounds or large blocks breaks the system.

**The No Tint Rule.** Black is `#000000`. White is `#ffffff`. No warm or cool bias. The palette earns its neutrality through restraint, not through warmth.

## 3. Typography

**Display / Headline / Body Font:** Nohemi Variable (self-hosted, weights 100–900)
**Fallback stack:** Inter Tight, Helvetica Neue, Helvetica, Arial, sans-serif

**Character:** One font, one family, one decision. Nohemi's variable axis handles all hierarchy from feather-light labels at weight 300 to aggressive 800-weight display type. The contrast between a 9px/300 label at 0.16em letter-spacing and an 800-weight headline at −0.04em tracking covers the entire expressive range the site needs.

### Hierarchy
- **Display** (weight 800, `clamp(80px, 14vw, 200px)`, line-height 1, tracking −0.04em): Landing page hero name only. Never used elsewhere.
- **Headline** (weight 800, `clamp(48px, 8vw, 96px)`, line-height 0.88, tracking −0.03em): Project page titles and section headings.
- **Title** (weight 600, `22–26px`, line-height 1.1, tracking −0.01em): Work titles in list views, tile overlays.
- **Body** (weight 300, `15px`, line-height 1.8): Descriptions and all running text. Cap at ~65ch.
- **Label** (weight 300, `9–10px`, letter-spacing `0.16–0.26em`, uppercase): Navigation links, eyebrows, meta information, tags, year markers. The extreme tracking at this small size creates the "cinematic subtitle" feel that runs throughout the system.

### Named Rules
**The Weight-Tracking Inverse Rule.** As weight goes up, tracking goes negative. As weight goes down, tracking goes positive. Display type at 800 is tight (−0.04em). Label type at 300 is wide (+0.16em). Never set a heavy weight with wide tracking or a light weight with tight tracking.

**The All-Caps Label Rule.** Labels are always uppercase and always at 9–10px with wide tracking. This is the system's secondary typographic register — it should never be imitated at larger sizes.

## 4. Elevation

This system is **radically flat**. No shadows. No blur. No backdrop-filter on persistent surfaces. Depth is conveyed exclusively through opacity and layering — darker elements recede, lighter elements advance.

The hero video background operates at the base layer (z-index 0). The nav is fixed at z-index 100. Custom cursors float at z-index 9999. Every other element sits in normal flow between these anchors. No surface floats above another through shadow or elevation — only through z-index and opacity.

The single exception is the mobile nav dropdown, which uses `backdrop-filter: blur(16px)` on a `rgba(0,0,0,0.92)` background — the only blurred surface in the system, reserved for overlay panels.

### Named Rules
**The Flat-By-Default Rule.** No element casts a shadow at rest. Depth is earned through position and opacity, never through elevation chrome. If you reach for `box-shadow`, stop and reconsider whether the hierarchy problem can be solved with opacity, spacing, or z-index instead.

## 5. Components

### Navigation
- **Style:** Fixed top bar, CSS grid (1fr auto), transparent background at all scroll depths
- **Logo:** Nohemi 700, 13px, tracking −0.01em, white
- **Links:** Nohemi 300, 10px, tracking 0.16em, uppercase, `rgba(255,255,255,0.62)` at rest
- **Active state:** weight 600, white, 1px underline in Deep Cinnabar (#620c0a), offset 5px
- **Hover:** color transitions to white in 240ms via strong ease-out
- **Active section:** persisted via sessionStorage — drilling into a project keeps the originating section highlighted, not "Selected Works"
- **Mobile:** hamburger button (3 lines → X animation), full-width dropdown panel with backdrop-blur

### Back Button
- **Shape:** Fully rounded pill (border-radius 999px)
- **Style:** Transparent background, 1px white border, arrow icon only — no text
- **Size:** ~36px height, padding 10px 18px
- **Position:** Fixed below nav on project detail pages

### Project Tiles (Selected Works grid)
- **Aspect ratio:** 16:9
- **Background:** `#050505` (near-black)
- **Video:** Covers the tile, `saturate(0.95) contrast(1.04)` filter
- **Hover (pointer devices only):** video scales to 1.03× in 250ms ease-out; meta overlay fades in from −6px translateY in 200ms
- **Meta overlay:** gradient fade from top (`rgba(0,0,0,0.55)` → transparent), title + year in white
- **Reveal:** Tiles enter from `translateY(24px) opacity(0)` → rest via IntersectionObserver, 400ms ease-out

### Video Strips (Video Work page)
- **Layout:** Full-viewport-height rows, stacked vertically
- **Background video:** Full-bleed, opacity-swapped on hover (no re-load, pre-played)
- **Typography:** Project title in headline scale, subtitle in label scale
- **Hover:** Video background fades in instantly (pre-loaded); strip receives subtle highlight

### Custom Cursor
- **Dot:** 6px white circle, floats at cursor position (0.6 lerp factor — snappy)
- **Ring:** 28px circle, 1px border `rgba(255,255,255,0.15)`, lazy follow (0.14 lerp — floats)
- **Hover state:** dot expands to 32px transparent circle with 1px solid border; ring fades out
- **Desktop only:** hidden on touch devices via `@media (hover: none)`

## 6. Do's and Don'ts

### Do:
- **Do** use Nohemi weight 800 at tight negative tracking (−0.03 to −0.04em) for all primary headings. The compressed weight-tracking combination is the system's typographic signature.
- **Do** use label type (9–10px, weight 300, 0.16–0.26em tracking, uppercase) for all meta information, tags, eyebrows, and navigation. This is the only label treatment.
- **Do** keep the canvas pure black (`#000000`). No tinted backgrounds, no off-black surfaces, no dark-grey alternatives.
- **Do** let video and images be the loudest element on any page. UI should whisper; work should speak.
- **Do** gate all hover effects behind `@media (hover: hover) and (pointer: fine)`. Touch devices must not receive stuck hover states.
- **Do** use the custom easing `cubic-bezier(0.16, 1, 0.3, 1)` for all UI transitions. This is the system's motion signature — do not substitute `ease`, `ease-out`, or linear.
- **Do** keep UI transitions at 200–250ms. Scroll reveals at 400ms. Nothing functional above 300ms.

### Don't:
- **Don't** add shadows, gradients, or backdrop-blur to anything except the mobile dropdown panel. The system is flat; adding elevation chrome immediately breaks it.
- **Don't** use Deep Cinnabar (`#620c0a`) as a background colour or on large elements. It is an accent and a marker — a sliver, never a surface.
- **Don't** introduce a second typeface. Nohemi's variable axis covers every typographic need. A second family breaks the "single voice" principle.
- **Don't** add border-radius to content containers, cards, or tiles. The system uses sharp edges everywhere except the back button pill. Rounded cards signal a different, warmer aesthetic — the opposite of what this system represents.
- **Don't** animate elements that appear frequently (keyboard shortcuts, repeated micro-interactions). Animation is reserved for entries, reveals, and state changes — not for things users do dozens of times.
- **Don't** make the UI compete with the work. If a page feels designed, the balance is wrong. The work is the foreground; every design decision is the background.
- **Don't** let the site feel busy, decorative for its own sake, or try too hard to signal creativity through visual noise. From PRODUCT.md: *"The work speaks — the site should get out of its way."*
