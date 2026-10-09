"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStayStill } from "./PreviewVideo";
import { useCanHover } from "./playback";

export type HeroItem = {
  slug: string;
  title: string;
  /** "tag · location · year" */
  label: string;
  /** Preview clip, e.g. /videos/solene-preview.mp4 */
  video: string;
  /** 1280x720 poster */
  poster: string;
  /** ~24px blur-up that sits under the poster */
  tiny: string;
};

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
  item: HeroItem;
  index: number;
  on: boolean;
  /** First layer: eager poster. */
  first: boolean;
  /** The <video> element exists at all (desktop, motion allowed, after hydration). */
  canVideo: boolean;
  /** This clip may hold a src (current, or the one about to play). */
  load: boolean;
  /** This clip is meant to be playing right now. */
  play: boolean;
  /** Next clip, buffering ahead of time. */
  warming: boolean;
  loop: boolean;
  register: (index: number, el: HTMLVideoElement | null) => void;
  onEnded: (index: number) => void;
  onError: (index: number) => void;
  onTime: (index: number, v: HTMLVideoElement) => void;
};

/**
 * One full-frame layer. The poster <img> is server-rendered; the <video> only exists after
 * hydration (canVideo) and only carries a src while it is the current or the warming clip.
 */
function HeroLayer({ item, index, on, first, canVideo, load, play, warming, loop, register, onEnded, onError, onTime }: LayerProps) {
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

  const imgStyle = { backgroundImage: `url(${item.tiny})` };
  const imgProps = {
    alt: "",
    width: 1280,
    height: 720,
    decoding: "async" as const,
    draggable: false,
    style: imgStyle,
  };

  return (
    <div className={on ? "hd-layer is-on" : "hd-layer"} aria-hidden="true">
      {first ? (
        // Only desktop widths fetch the full poster; phones get the 24px blur-up for this hidden branch.
        <picture>
          <source media={DESKTOP_QUERY} srcSet={item.poster} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.tiny} loading="eager" fetchPriority="high" {...imgProps} />
        </picture>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.poster} loading="lazy" {...imgProps} />
      )}
      {canVideo && (
        <video
          ref={setRef}
          src={load ? item.video : undefined}
          muted
          playsInline
          loop={loop}
          preload={warming ? "auto" : load ? "metadata" : "none"}
          controls={false}
          disablePictureInPicture
          tabIndex={-1}
          onPlaying={() => setStarted(true)}
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
 * Desktop hero: the whole first viewport is the current featured clip. Titles bottom-left
 * swap it on hover or focus. Phones never mount a <video>: the CSS hides this section and
 * `desktop` stays false below 769px.
 */
export default function HeroFrame({ items }: { items: HeroItem[] }) {
  const N = items.length;
  const still = useStayStill();
  const desktop = useDesktop();
  const canHover = useCanHover();
  const canVideo = desktop && still === false;

  const [cur, setCur] = useState(0);
  const [auto, setAuto] = useState(N > 1);
  const [warm, setWarm] = useState(-1);
  // Outgoing clip keeps its src for the crossfade, then drops it.
  const [prev, setPrev] = useState(-1);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  const heroRef = useRef<HTMLElement>(null);
  const tcRef = useRef<HTMLParagraphElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const curRef = useRef(0);
  const autoRef = useRef(N > 1);
  const prevTimer = useRef<number | null>(null);
  const intentTimer = useRef<number | null>(null);
  const failed = useRef<Set<number>>(new Set());

  const clearIntent = useCallback(() => {
    if (intentTimer.current !== null) {
      window.clearTimeout(intentTimer.current);
      intentTimer.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      if (prevTimer.current !== null) window.clearTimeout(prevTimer.current);
      if (intentTimer.current !== null) window.clearTimeout(intentTimer.current);
    },
    []
  );

  const register = useCallback((i: number, el: HTMLVideoElement | null) => {
    videos.current[i] = el;
  }, []);

  const go = useCallback(
    (i: number) => {
      const n = ((i % N) + N) % N;
      if (n === curRef.current) return;
      const old = curRef.current;
      curRef.current = n;
      setCur(n);
      setPrev(old);
      if (prevTimer.current !== null) window.clearTimeout(prevTimer.current);
      prevTimer.current = window.setTimeout(() => {
        prevTimer.current = null;
        setPrev(-1);
      }, 260);
      setWarm((w) => (w === n ? -1 : w));
    },
    [N]
  );

  // The viewer took over: stop auto-advancing and loop the current clip.
  const hold = useCallback(() => {
    if (!autoRef.current) return;
    autoRef.current = false;
    setAuto(false);
    setWarm(-1);
    const v = videos.current[curRef.current];
    if (v) {
      v.loop = true;
      if (v.ended) {
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
      }
    }
  }, []);

  // Next clip that has not failed to load; stays put if every other clip failed.
  const advance = useCallback(() => {
    for (let k = 1; k < N; k++) {
      const n = (curRef.current + k) % N;
      if (!failed.current.has(n)) return go(n);
    }
  }, [N, go]);

  const onEnded = useCallback(
    (i: number) => {
      if (i === curRef.current && autoRef.current) advance();
    },
    [advance]
  );

  // A clip that 404s or cannot decode never fires `ended`: treat the error like it.
  // Current clip: advance if auto, otherwise stay on its poster. Other clips: remember so auto-advance skips them.
  const onError = useCallback(
    (i: number) => {
      failed.current.add(i);
      if (i !== curRef.current) {
        setWarm((w) => (w === i ? -1 : w));
        return;
      }
      if (autoRef.current) advance();
    },
    [advance]
  );

  // 1 s before the current clip ends (auto-advance only) the next clip gets its src.
  const onTime = useCallback(
    (i: number, v: HTMLVideoElement) => {
      if (i !== curRef.current || !autoRef.current || !v.duration) return;
      if (v.duration - v.currentTime <= 1) setWarm((curRef.current + 1) % N);
    },
    [N]
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

  // Timecode of the playing clip, 24 fps. Written straight to the DOM, no React renders.
  const running = canVideo && inView && tabVisible;
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = "";
    const tick = () => {
      const tc = tcRef.current;
      const v = videos.current[curRef.current];
      if (tc) {
        const next = timecode(v ? v.currentTime : 0);
        if (next !== last) {
          last = next;
          tc.textContent = next;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, cur]);

  const item = items[cur];

  return (
    <section className="hd" ref={heroRef} aria-label="Chosen work">
      {items.map((it, i) => (
        <HeroLayer
          key={it.slug}
          item={it}
          index={i}
          on={i === cur}
          first={i === 0}
          canVideo={canVideo}
          load={canVideo && (i === cur || i === warm || (i === prev && warm < 0))}
          play={running && i === cur}
          warming={i === warm && i !== cur}
          loop={!auto}
          register={register}
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
              <li key={it.slug} className={i === cur ? "is-current" : undefined}>
                <Link
                  href={`/work/${it.slug}`}
                  aria-current={i === cur ? "true" : undefined}
                  onMouseEnter={() => {
                    if (!canHover) return;
                    // Hover intent: sweeping across titles must not swap and fetch each clip.
                    clearIntent();
                    intentTimer.current = window.setTimeout(() => {
                      intentTimer.current = null;
                      hold();
                      go(i);
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
                    go(i);
                  }}
                  onClick={(e) => {
                    // Touch: the first tap on another title swaps the frame, a tap on the current one opens it.
                    if (!canHover && i !== curRef.current) {
                      e.preventDefault();
                      hold();
                      go(i);
                    }
                  }}
                >
                  <span className="n">{pad(i + 1)}</span>
                  <span className="t">{it.title}</span>
                </Link>
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
                go(curRef.current - 1);
              }}
            >
              Prev
            </button>
            <span className="hd-count" aria-live="polite">
              {cur + 1} / {N}
            </span>
            <button
              type="button"
              aria-label="Next work"
              onClick={() => {
                hold();
                go(curRef.current + 1);
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
