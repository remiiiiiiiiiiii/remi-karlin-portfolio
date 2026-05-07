"use client";

import { useEffect, useRef } from "react";

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
  ],
  [
    { label: "morocco", video: "/videos/morocco-preview.mp4" },
    { label: "amsterdam", video: "/videos/amsterdam-preview.mp4" },
    { label: "vietnam", video: "/videos/vietnam-preview.mp4" },
    { label: "fan-yan-1", video: "/videos/fan-yan-1-preview.mp4" },
    { label: "fan-yan-2", video: "/videos/fan-yan-2-preview.mp4" },
    { label: "b1nbags-1", video: "/videos/b1nbags-1-preview.mp4" },
    { label: "b1nbags-3", video: "/videos/b1nbags-3-preview.mp4" },
  ],
  [
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

export default function Hero() {
  const stripRefs = useRef<Array<HTMLDivElement | null>>([]);
  const heroNameRef = useRef<HTMLHeadingElement>(null);
  const heroFixedRef = useRef<HTMLDivElement>(null);
  const heroFadeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const states = stripRefs.current.map((el, stripIdx) => {
      if (!el) return null;
      const sources = STRIP_SOURCES[stripIdx];
      const layers: HTMLDivElement[] = [];
      sources.forEach((src, i) => {
        const layer = document.createElement("div");
        layer.className = "strip-frame";
        layer.dataset.label = src.label;
        const v = document.createElement("video");
        v.src = src.video;
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.setAttribute("playsinline", "");
        v.setAttribute("muted", "");
        v.preload = "auto";
        v.controls = false;
        layer.appendChild(v);
        el.appendChild(layer);
        layers.push(layer);
        if (i === 0) {
          layer.classList.add("is-current");
          const p = v.play();
          if (p && p.catch) p.catch(() => {});
        }
      });
      return { layers, idx: 0, sources };
    });

    const tickStrip = (state: { layers: HTMLDivElement[]; idx: number; sources: typeof STRIP_SOURCES[number] }) => {
      const cur = state.idx;
      const nxt = (cur + 1) % state.sources.length;
      const incoming = state.layers[nxt];
      const outgoing = state.layers[cur];
      const inV = incoming.querySelector("video");
      if (inV) {
        try {
          inV.currentTime = 0;
        } catch (_) {}
        const p = inV.play();
        if (p && p.catch) p.catch(() => {});
      }
      setTimeout(() => {
        incoming.classList.add("is-current");
        outgoing.classList.remove("is-current");
      }, 60);
      state.idx = nxt;
    };

    const intervals = states.map((st, i) => {
      if (!st) return null;
      return window.setInterval(() => tickStrip(st), INTERVALS[i]);
    });

    return () => {
      intervals.forEach((id) => {
        if (id) window.clearInterval(id);
      });
      stripRefs.current.forEach((el) => {
        if (el) el.innerHTML = "";
      });
    };
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
    };
    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => scrollEl.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="hero" id="top">
      <div className="strips" id="strips" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="strip"
            data-strip={i}
            ref={(el) => {
              stripRefs.current[i] = el;
            }}
          />
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
          <span>REMI</span>
          <span>KARLIN</span>
        </h1>
        <div className="hero-sub">
          Filmmaker<span className="sep">·</span>Cinematographer<span className="sep">·</span>Artistic Director
        </div>
      </div>
    </div>
  );
}
