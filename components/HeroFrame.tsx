"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { posterPath } from "@/lib/posters";
import { useStayStill } from "./PreviewVideo";
import { useCanHover } from "./playback";

export type HeroItem = {
  slug: string;
  title: string;
  /** "tag · location · year" */
  label: string;
  /** Every preview clip of the project in play order, e.g. ["/videos/solene-preview.mp4"]. Posters derive from the path. A still image (.webp/.jpg/.jpeg/.png/.avif) is also allowed: it shows full-frame for STILL_MS. */
  clips: string[];
  /** Agency hub only: its client pages, shown in brackets after the title while the row is current or hovered. */
  clients?: { slug: string; title: string }[];
};

/** One clip of one featured project. Every clip is its own full-frame layer. `image`: a still, no <video>. */
type Slot = { pi: number; ci: number; src: string; poster: string; tiny: string; image: boolean };

/** How long a still image stays on screen before the hero advances. */
const STILL_MS = 3000;
/** Duration of the swipe-in of a still; keep in sync with the hd-swipe animation in globals.css. */
const STILL_SWIPE_MS = 560;
const isImage = (src: string) => /\.(webp|jpe?g|png|avif)$/i.test(src);

const pad = (n: number) => String(n).padStart(2, "0");
const DESKTOP_QUERY = "(min-width: 769px)";

/** Seconds -> HH:MM:SS:FF at 24 fps. */
function timecode(seconds: number): string {
  const f = Math.floor((seconds || 0) * 24);
  return `${pad(Math.floor(f / 86400))}:${pad(Math.floor(f / 1440) % 60)}:${pad(Math.floor(f / 24) % 60)}:${pad(f % 24)}`;
}

/** True once the viewport is desktop width. false on the server and on the first client render. */
function useDesktop(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

type LayerProps = {
  slot: Slot;
  index: number;
  on: boolean;
  /** Same-project clip change: this layer is the incoming one (sits on top, no blur). */
  clip: boolean;
  /** Same-project clip change: this layer is the outgoing one (stays opaque under the incoming one). */
  hold: boolean;
  /** Very first layer: eager poster. */
  first: boolean;
  /** The <video> element exists at all (desktop, motion allowed, after hydration). */
  canVideo: boolean;
  /** This clip may hold a src (current, next, or the one fading out). */
  load: boolean;
  /** This clip is meant to be playing right now. */
  play: boolean;
  /** Next clip, buffering ahead of time. */
  warming: boolean;
  loop: boolean;
  register: (index: number, el: HTMLVideoElement | null) => void;
  onPlaying: (index: number) => void;
  onEnded: (index: number) => void;
  onError: (index: number) => void;
  onTime: (index: number, v: HTMLVideoElement) => void;
};

/**
 * One full-frame layer. The poster <img> is server-rendered for the first clip of every project
 * (other clips mount theirs only while they load); the <video> only exists after hydration
 * (canVideo) and only carries a src while it is the current, the warming or the outgoing clip.
 */
function HeroLayer({ slot, index, on, clip, hold, first, canVideo, load, play, warming, loop, register, onPlaying, onEnded, onError, onTime }: LayerProps) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [started, setStarted] = useState(false);

  const setRef = useCallback(
    (el: HTMLVideoElement | null) => {
      ref.current = el;
      register(index, el);
    },
    [index, register]
  );

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    if (play && load) {
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    } else {
      v.pause();
    }
  }, [play, load, canVideo]);

  // src was dropped: release the buffered media; the poster underneath stays visible.
  useEffect(() => {
    if (load) return;
    setStarted(false);
    const v = ref.current;
    if (v && v.currentSrc) v.load();
  }, [load]);

  const imgStyle = { backgroundImage: `url(${slot.tiny})` };
  const imgProps = {
    alt: "",
    width: 1280,
    height: 720,
    decoding: "async" as const,
    draggable: false,
    style: imgStyle,
  };
  // A still that fails to load is skipped like a clip that errors.
  if (slot.image) Object.assign(imgProps, { onError: () => onError(index) });
  const cls = ["hd-layer", on && "is-on", clip && "is-clip", hold && "is-hold", slot.image && "is-still"].filter(Boolean).join(" ");

  return (
    <div className={cls} aria-hidden="true">
      {first ? (
        // Only desktop widths fetch the full poster; phones get the 24px blur-up for this hidden branch.
        <picture>
          <source media={DESKTOP_QUERY} srcSet={slot.poster} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slot.tiny} loading="eager" fetchPriority="high" {...imgProps} />
        </picture>
      ) : slot.ci === 0 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slot.poster} loading={slot.image && load ? "eager" : "lazy"} {...imgProps} />
      ) : load ? (
        // Later clips: poster only while the clip is about to be used, so idle clips cost nothing.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slot.poster} loading="eager" {...imgProps} />
      ) : null}
      {canVideo && !slot.image && (
        <video
          ref={setRef}
          src={load ? slot.src : undefined}
          muted
          playsInline
          loop={loop}
          preload={warming ? "auto" : load ? "metadata" : "none"}
          controls={false}
          disablePictureInPicture
          tabIndex={-1}
          onPlaying={() => {
            setStarted(true);
            onPlaying(index);
          }}
          onEnded={() => onEnded(index)}
          onError={() => onError(index)}
          onTimeUpdate={(e) => onTime(index, e.currentTarget)}
          style={{ opacity: started && load ? 1 : 0 }}
        />
      )}
    </div>
  );
}

/**
 * Desktop hero: the whole first viewport is the current featured clip. Each project plays all of
 * its preview clips in turn; titles bottom-left swap the project on hover or focus. Phones never
 * mount a <video>: the CSS hides this section and `desktop` stays false below 769px.
 *
 * State is one flat clip index (`cur`) over [project 1 clip 1.., project 2 clip 1.., ..]; the project
 * and the clip number are derived from it. Auto mode walks that list; after the first interaction
 * (`auto` false) it cycles within the chosen project only.
 */
export default function HeroFrame({ items: baseItems }: { items: HeroItem[] }) {
  // Dev-only: ?heroStills=1 appends a synthetic still-image project (client-side, after mount).
  const [extra, setExtra] = useState<HeroItem[]>([]);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && window.location.search.includes("heroStills=1")) {
      setExtra([{ slug: "stills-test", title: "Stills test", label: "test", clips: ["/images/thumbs/halatia.webp", "/images/thumbs/the-outfiters.webp"] }]);
    }
  }, []);
  const items = useMemo(() => (extra.length ? [...baseItems, ...extra] : baseItems), [baseItems, extra]);
  const N = items.length;
  const still = useStayStill();
  const desktop = useDesktop();
  const canHover = useCanHover();
  const canVideo = desktop && still === false;

  const { slots, starts, lens } = useMemo(() => {
    const slots: Slot[] = [];
    const starts: number[] = [];
    const lens: number[] = [];
    items.forEach((it, pi) => {
      starts.push(slots.length);
      lens.push(it.clips.length);
      it.clips.forEach((src, ci) => slots.push({ pi, ci, src, poster: posterPath(src), tiny: posterPath(src, true), image: isImage(src) }));
    });
    return { slots, starts, lens };
  }, [items]);
  const T = slots.length;

  // cur: the clip that plays. shown: the clip that is visible (differs from cur only while a
  // same-project clip waits for its first frame). prev: the clip fading out. warm: the next clip.
  const [cur, setCur] = useState(0);
  const [shown, setShown] = useState(0);
  const [auto, setAuto] = useState(N > 1);
  const [warm, setWarm] = useState(-1);
  const [prev, setPrev] = useState(-1);
  const [xclip, setXclip] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  const heroRef = useRef<HTMLElement>(null);
  const tcRef = useRef<HTMLParagraphElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const curRef = useRef(0);
  const shownRef = useRef(0);
  const autoRef = useRef(N > 1);
  const prevTimer = useRef<number | null>(null);
  const revealTimer = useRef<number | null>(null);
  const intentTimer = useRef<number | null>(null);
  const failed = useRef<Set<number>>(new Set());

  const clearIntent = useCallback(() => {
    if (intentTimer.current !== null) {
      window.clearTimeout(intentTimer.current);
      intentTimer.current = null;
    }
  }, []);
  const clearPrev = useCallback(() => {
    if (prevTimer.current !== null) {
      window.clearTimeout(prevTimer.current);
      prevTimer.current = null;
    }
  }, []);
  const clearReveal = useCallback(() => {
    if (revealTimer.current !== null) {
      window.clearTimeout(revealTimer.current);
      revealTimer.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      if (prevTimer.current !== null) window.clearTimeout(prevTimer.current);
      if (revealTimer.current !== null) window.clearTimeout(revealTimer.current);
      if (intentTimer.current !== null) window.clearTimeout(intentTimer.current);
    },
    []
  );

  const register = useCallback((i: number, el: HTMLVideoElement | null) => {
    videos.current[i] = el;
  }, []);

  // Make clip n the visible one; the previously visible clip fades out for 260 ms.
  const reveal = useCallback(
    (n: number) => {
      if (n !== curRef.current || shownRef.current === n) return;
      clearReveal();
      clearPrev();
      const out = shownRef.current;
      shownRef.current = n;
      setShown(n);
      setPrev(out);
      // A still swipes in over the outgoing layer (see .hd-layer.is-still.is-on), so that layer stays longer.
      prevTimer.current = window.setTimeout(() => {
        prevTimer.current = null;
        setPrev(-1);
      }, slots[n].image ? STILL_SWIPE_MS + 80 : 260);
    },
    [slots, clearPrev, clearReveal]
  );

  /**
   * Switch the playing clip to n. A natural advance inside the same project keeps the outgoing
   * clip on screen until the incoming one has fired `playing` (see onPlaying); anything else
   * (another project, or a viewer's choice) crossfades straight away.
   */
  const go = useCallback(
    (n: number, natural: boolean) => {
      if (n === curRef.current) return;
      curRef.current = n;
      setCur(n);
      setWarm(-1);
      clearPrev();
      clearReveal();
      if (natural && slots[n].pi === slots[shownRef.current].pi) {
        setXclip(true);
        if (slots[n].image) {
          // An incoming still has no `playing` event to wait for: show it straight away, outgoing layer held underneath.
          reveal(n);
        } else {
          setPrev(-1);
          // Safety net: if the first frame never arrives, show the poster rather than the stale clip.
          revealTimer.current = window.setTimeout(() => {
            revealTimer.current = null;
            reveal(n);
          }, 1500);
        }
      } else {
        setXclip(false);
        reveal(n);
      }
    },
    [slots, clearPrev, clearReveal, reveal]
  );

  const goProject = useCallback(
    (p: number) => {
      const n = ((p % N) + N) % N;
      if (n === slots[curRef.current].pi || lens[n] === 0) return;
      go(starts[n], false);
    },
    [N, slots, starts, lens, go]
  );

  // Next playable clip after `from`: the whole list while auto-advancing, the project's own clips
  // (wrapping to its first) once held. -1 when nothing else is left (the rest failed to load).
  const nextOf = useCallback(
    (from: number, isAuto: boolean): number => {
      if (isAuto) {
        for (let k = 1; k < T; k++) {
          const n = (from + k) % T;
          if (!failed.current.has(n)) return n;
        }
        return -1;
      }
      const pi = slots[from].pi;
      const s = starts[pi];
      const len = lens[pi];
      for (let k = 1; k < len; k++) {
        const n = s + ((from - s + k) % len);
        if (!failed.current.has(n)) return n;
      }
      return -1;
    },
    [T, slots, starts, lens]
  );

  // The viewer took over: stay on this project and keep cycling its clips.
  const hold = useCallback(() => {
    if (!autoRef.current) return;
    autoRef.current = false;
    setAuto(false);
    setWarm(-1);
    const c = curRef.current;
    const v = videos.current[c];
    if (v) {
      if (lens[slots[c].pi] === 1) v.loop = true;
      if (v.ended) {
        v.currentTime = 0;
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
      }
    }
  }, [slots, lens]);

  // First frame of a clip is on screen: now the same-project switch can show it.
  const onPlaying = useCallback(
    (i: number) => {
      reveal(i);
    },
    [reveal]
  );

  const onEnded = useCallback(
    (i: number) => {
      if (i !== curRef.current) return;
      const n = nextOf(i, autoRef.current);
      if (n >= 0) return go(n, true);
      // Nothing else playable: replay this one.
      const v = videos.current[i];
      if (v) {
        v.currentTime = 0;
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
      }
    },
    [nextOf, go]
  );

  // A clip that 404s or cannot decode never fires `ended`: treat the error like it.
  // Current clip: skip to the next playable one, or stay on its poster if there is none. Other clips: remember so we skip them.
  const onError = useCallback(
    (i: number) => {
      failed.current.add(i);
      if (i !== curRef.current) {
        setWarm((w) => (w === i ? -1 : w));
        return;
      }
      const n = nextOf(i, autoRef.current);
      if (n >= 0) go(n, true);
    },
    [nextOf, go]
  );

  // 1 s before the current clip ends the next clip (whichever mode) gets its src.
  const onTime = useCallback(
    (i: number, v: HTMLVideoElement) => {
      if (i !== curRef.current || shownRef.current !== i || !v.duration) return;
      if (v.duration - v.currentTime <= 1) setWarm(nextOf(i, autoRef.current));
    },
    [nextOf]
  );

  // Pause when the hero leaves the scroll area (threshold .35) and when the tab is hidden.
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([en]) => setInView(en.isIntersecting), {
      root: document.getElementById("scrollRoot"),
      threshold: 0.35,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onVis = () => setTabVisible(!document.hidden);
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const running = canVideo && inView && tabVisible;

  // Still image as the current slot: after STILL_MS advance like a clip that ended, warming the next
  // slot 1 s before. Elapsed time is kept across pauses (out of view, tab hidden, hold) so neither the
  // timer nor the timecode restarts; it resets when the slot changes.
  const stillBase = useRef(0);
  const stillT0 = useRef(0);
  const stillFor = useRef(-1);
  const curImage = slots[cur].image;
  useEffect(() => {
    if (!curImage) {
      stillFor.current = -1;
      return;
    }
    if (stillFor.current !== cur) {
      stillFor.current = cur;
      stillBase.current = 0;
    }
    if (!running) return;
    stillT0.current = performance.now();
    const left = Math.max(0, STILL_MS - stillBase.current);
    // Both timers re-check `cur`: a hover can move on in the gap before this effect's cleanup runs.
    const warmTimer = window.setTimeout(() => {
      if (curRef.current !== cur) return;
      setWarm(nextOf(cur, autoRef.current));
    }, Math.max(0, left - 1000));
    const timer = window.setTimeout(() => {
      if (curRef.current !== cur) return;
      // Same as onEnded: nothing else playable (or a held single still) means stay on this one.
      const n = nextOf(cur, autoRef.current);
      if (n >= 0) go(n, true);
    }, left);
    return () => {
      window.clearTimeout(warmTimer);
      window.clearTimeout(timer);
      stillBase.current += performance.now() - stillT0.current;
    };
  }, [running, curImage, cur, auto, nextOf, go]);

  // Timecode of the playing clip (or elapsed time of a still), 24 fps; restarts at 0 on every slot change. Written straight to the DOM, no React renders.
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = "";
    const tick = () => {
      const tc = tcRef.current;
      const c = curRef.current;
      const v = videos.current[c];
      if (tc) {
        const secs = slots[c].image && stillFor.current === c ? (stillBase.current + performance.now() - stillT0.current) / 1000 : v ? v.currentTime : 0;
        const next = timecode(secs);
        if (next !== last) {
          last = next;
          tc.textContent = next;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, cur, slots]);

  const proj = slots[cur].pi;
  const clipNo = slots[cur].ci;
  const item = items[proj];

  // Test hooks: data-project / data-clip (0-based) / data-src on the .hero-d wrapper (the section if there is none).
  useEffect(() => {
    const host = heroRef.current?.closest<HTMLElement>(".hero-d") ?? heroRef.current;
    if (!host) return;
    host.dataset.project = String(proj);
    host.dataset.clip = String(clipNo);
    host.dataset.src = slots[cur].src;
  }, [proj, clipNo, cur, slots]);
  return (
    <section className="hd" ref={heroRef} aria-label="Chosen work">
      {slots.map((sl, i) => (
        <HeroLayer
          key={`${sl.pi}:${sl.src}`}
          slot={sl}
          index={i}
          on={i === shown}
          clip={xclip && i === cur}
          hold={xclip && i === prev}
          first={i === 0}
          canVideo={canVideo}
          load={canVideo && (i === cur || i === warm || i === shown || i === prev)}
          play={running && i === cur}
          warming={i === warm && i !== cur}
          loop={!auto && lens[sl.pi] === 1}
          register={register}
          onPlaying={onPlaying}
          onEnded={onEnded}
          onError={onError}
          onTime={onTime}
        />
      ))}
      <div className="hd-shade" aria-hidden="true" />
      {canVideo && (
        <p className="hd-tc label" ref={tcRef} aria-hidden="true">
          00:00:00:00
        </p>
      )}
      <div className="hd-over">
        <nav aria-label="Chosen work">
          <ol className="hd-list">
            {items.map((it, i) => (
              <li key={it.slug} className={[i === proj && "is-current", it.clients && "has-clients"].filter(Boolean).join(" ") || undefined}>
                <Link
                  href={`/work/${it.slug}`}
                  aria-current={i === proj ? "true" : undefined}
                  onMouseEnter={() => {
                    if (!canHover) return;
                    // Hover intent: sweeping across titles must not swap and fetch each clip.
                    clearIntent();
                    intentTimer.current = window.setTimeout(() => {
                      intentTimer.current = null;
                      hold();
                      goProject(i);
                    }, 80);
                  }}
                  onMouseLeave={clearIntent}
                  onFocus={(e) => {
                    // Keyboard focus only: a tap or click that focuses the link must not pre-empt its own click.
                    let kb = true;
                    try {
                      kb = e.currentTarget.matches(":focus-visible");
                    } catch {
                      /* older engines: treat as keyboard */
                    }
                    if (!kb) return;
                    clearIntent();
                    hold();
                    goProject(i);
                  }}
                  onClick={(e) => {
                    // Touch: the first tap on another title swaps the frame, a tap on the current one opens it.
                    if (!canHover && i !== slots[curRef.current].pi) {
                      e.preventDefault();
                      hold();
                      goProject(i);
                    }
                  }}
                >
                  <span className="n">{pad(i + 1)}</span>
                  <span className="t">{it.title}</span>
                </Link>
                {it.clients && it.clients.length > 0 && (
                  <span className="hd-clients" aria-label={`${it.title} clients`}>
                    <span aria-hidden="true">(</span>
                    {it.clients.map((c, k) => (
                      <span key={c.slug}>
                        {k > 0 && <span aria-hidden="true">, </span>}
                        <Link href={`/work/${c.slug}`}>{c.title}</Link>
                      </span>
                    ))}
                    <span aria-hidden="true">)</span>
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <div className="hd-side">
          <p className="hd-meta label">{item.label}</p>
          <div className="hd-ctrl">
            <button
              type="button"
              aria-label="Previous work"
              onClick={() => {
                hold();
                goProject(slots[curRef.current].pi - 1);
              }}
            >
              Prev
            </button>
            <span className="hd-count" aria-live="polite">
              {proj + 1} / {N}
            </span>
            <button
              type="button"
              aria-label="Next work"
              onClick={() => {
                hold();
                goProject(slots[curRef.current].pi + 1);
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
