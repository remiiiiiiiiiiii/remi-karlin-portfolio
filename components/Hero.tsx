"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PreviewVideo from "./PreviewVideo";
import { getFeaturedClips } from "./landing-data";

const STRIP_SOURCES: { label: string; video: string }[][] = [
  [
    { label: "hong-kong-lantau", video: "/videos/hong-kong-lantau-preview.mp4" },
    { label: "hong-kong-cliff", video: "/videos/hong-kong-cliff-preview.mp4" },
    { label: "hong-kong-junk", video: "/videos/hong-kong-junk-preview.mp4" },
    { label: "hong-kong-ssp", video: "/videos/hong-kong-ssp-preview.mp4" },
    { label: "hong-kong", video: "/videos/hong-kong-preview.mp4" },
    { label: "spain", video: "/videos/spain-preview.mp4" },
    { label: "france-chamonix", video: "/videos/france-chamonix-preview.mp4" },
    { label: "france-south", video: "/videos/france-south-preview.mp4" },
    { label: "avignon", video: "/videos/avignon-preview.mp4" },
  ],
  [
    { label: "morocco", video: "/videos/morocco-preview.mp4" },
    { label: "amsterdam", video: "/videos/amsterdam-preview.mp4" },
    { label: "vietnam", video: "/videos/vietnam-preview.mp4" },
    { label: "venice", video: "/videos/venice-preview.mp4" },
    { label: "new-york", video: "/videos/newyork-preview.mp4" },
    { label: "fan-yan-1", video: "/videos/fan-yan-1-preview.mp4" },
    { label: "fan-yan-2", video: "/videos/fan-yan-2-preview.mp4" },
    { label: "b1nbags-1", video: "/videos/b1nbags-1-preview.mp4" },
    { label: "b1nbags-3", video: "/videos/b1nbags-3-preview.mp4" },
  ],
  [
    { label: "solene", video: "/videos/solene-preview.mp4" },
    { label: "b1nbags-shot-expresso", video: "/videos/b1nbags-shot-expresso-preview.mp4" },
    { label: "essec-rmx-1", video: "/videos/essec-rmx-1-preview.mp4" },
    { label: "essec-rmx-2", video: "/videos/essec-rmx-2-preview.mp4" },
    { label: "essec-modessec-teaser", video: "/videos/essec-modessec-teaser-preview.mp4" },
    { label: "essec-modessec-aftermovie", video: "/videos/essec-modessec-aftermovie-preview.mp4" },
    { label: "essec-wei07", video: "/videos/essec-wei07-preview.mp4" },
    { label: "essec-wei-aftermovie", video: "/videos/essec-wei-aftermovie-preview.mp4" },
  ],
];

const INTERVALS = [4000, 5500, 3500];
const FADE_MS = 800; // matches .strip-frame opacity transition
const PRELOAD_DELAY_MS = 1200; // let the current clip win the bandwidth first

type Clip = { label: string; video: string };

/** Featured clips (data/projects.json `featured`) dealt round-robin into 3 strips; else STRIP_SOURCES. */
function buildStrips(): Clip[][] {
  const clips = getFeaturedClips();
  if (clips.length < 3) return STRIP_SOURCES;
  const strips: Clip[][] = [[], [], []];
  clips.forEach((video, i) => {
    strips[i % 3].push({ label: video.replace(/^.*\//, "").replace(/\.[^.]+$/, ""), video });
  });
  return strips;
}

/**
 * One strip. Only the current clip plays. The clip that is about to play is preloaded (src set,
 * not playing) shortly after the current one started; the outgoing clip is kept (paused on its
 * last frame) just for the dissolve and then unmounted.
 */
function Strip({
  sources,
  interval,
  active,
  index,
}: {
  sources: Clip[];
  interval: number;
  active: boolean;
  index: number;
}) {
  const [idx, setIdx] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [warmNext, setWarmNext] = useState(false);
  const idxRef = useRef(0);
  const n = sources.length;

  useEffect(() => {
    if (n < 2 || !active) return;
    let fadeTimer: number | undefined;
    const id = window.setInterval(() => {
      const cur = idxRef.current;
      const nxt = (cur + 1) % n;
      idxRef.current = nxt;
      setPrev(cur);
      setIdx(nxt);
      setWarmNext(false);
      window.clearTimeout(fadeTimer);
      fadeTimer = window.setTimeout(() => setPrev(null), FADE_MS + 100);
    }, interval);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(fadeTimer);
    };
  }, [n, interval, active]);

  // preload only the next clip, shortly after the current one started (never while inactive)
  useEffect(() => {
    if (n < 2) return;
    if (!active) {
      setWarmNext(false);
      return;
    }
    const t = window.setTimeout(() => setWarmNext(true), PRELOAD_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [idx, n, active]);

  const next = (idx + 1) % n;
  const layers = [prev, idx, n > 1 ? next : null].filter(
    (v, i, a): v is number => v !== null && a.indexOf(v) === i
  );

  return (
    <div className="strip" data-strip={index}>
      {layers.map((i) => {
        const isCurrent = i === idx;
        return (
          <div
            key={sources[i].label}
            className={isCurrent ? "strip-frame is-current" : "strip-frame"}
            data-label={sources[i].label}
          >
            <PreviewVideo
              src={sources[i].video}
              playing={isCurrent && active}
              warm={active && !isCurrent && i === next && warmNext}
              priority={i === 0 && idx === 0}
              holdFrame
            />
          </div>
        );
      })}
    </div>
  );
}

export default function Hero() {
  const heroNameRef = useRef<HTMLHeadingElement>(null);
  const heroFixedRef = useRef<HTMLDivElement>(null);
  const heroFadeRef = useRef<HTMLDivElement>(null);
  const strips = useMemo(buildStrips, []);
  const [onScreen, setOnScreen] = useState(true); // false once scrolled past the hero
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const onVis = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // scroll-driven hero animations
  useEffect(() => {
    const scrollEl = document.getElementById("scrollRoot") as HTMLDivElement | null;
    if (!scrollEl) return;
    const heroName = heroNameRef.current;
    const heroFixed = heroFixedRef.current;
    const heroFade = heroFadeRef.current;

    const onScroll = () => {
      const vh = window.innerHeight;
      const max = vh * 4.0;
      const t = Math.min(1, scrollEl.scrollTop / max);
      const eased = Math.pow(t, 1.6);
      const scale = 1 + eased * 0.18;
      const fade = 1 - eased * 0.2;
      const tracking = -0.03 + eased * 0.08;
      const glowBlur = (eased * 60).toFixed(2);
      const glowAlpha = (eased * 0.55).toFixed(3);
      const glowBlur2 = (eased * 24).toFixed(2);
      const glowAlpha2 = (eased * 0.35).toFixed(3);
      if (heroName) {
        heroName.style.transform = `scale(${scale.toFixed(4)})`;
        heroName.style.letterSpacing = tracking.toFixed(4) + "em";
        heroName.style.textShadow = `0 0 ${glowBlur2}px rgba(255,255,255,${glowAlpha2}), 0 0 ${glowBlur}px rgba(255,255,255,${glowAlpha})`;
      }
      if (heroFixed) heroFixed.style.opacity = fade.toFixed(3);

      const fadeStart = vh * 1.0;
      const fadeEnd = vh * 1.8;
      const ft = Math.min(1, Math.max(0, (scrollEl.scrollTop - fadeStart) / (fadeEnd - fadeStart)));
      const fadeEased = 1 - Math.pow(1 - ft, 2);
      if (heroFade) heroFade.style.opacity = fadeEased.toFixed(3);

      // hero is fully covered after ~1.8 viewports: stop decoding video nobody can see
      setOnScreen(scrollEl.scrollTop < vh * 2);
    };
    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => scrollEl.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="hero" id="top">
      <div className="strips" id="strips" aria-hidden="true">
        {strips.map((sources, i) => (
          <Strip key={i} index={i} sources={sources} interval={INTERVALS[i]} active={onScreen && tabVisible} />
        ))}
      </div>
      <div className="hero-overlay" />
      <div className="hero-fade" id="heroFade" ref={heroFadeRef} />
      <div className="hero-grain" />
      <div className="hero-text-fixed" aria-label="Intro" ref={heroFixedRef}>
        <div className="hero-eyebrow">
          Hong Kong<span className="dot">·</span>Paris<span className="dot">·</span>Available
        </div>
        <h1 className="hero-name" ref={heroNameRef}>
          <span>Remi</span>{" "}
          <span>Karlin</span>
        </h1>
        <div className="hero-sub">
          Filmmaker<span className="sep">·</span>Cinematographer<span className="sep">·</span>Artistic Director
        </div>
      </div>
    </div>
  );
}
