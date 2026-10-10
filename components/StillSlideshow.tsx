"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** Image paths in play order. */
  images: string[];
  /** How long each still stays on screen. */
  intervalMs?: number;
  /** Accessible name of the whole slideshow (the images themselves are decorative duplicates of the gallery). */
  label?: string;
};

const DESKTOP_QUERY = "(min-width: 769px)";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Still-image slideshow for the top of a page. The server renders the first still only; after mount,
 * and only on desktop widths with motion allowed (same rule as the homepage hero: phones never
 * autoplay anything), the other stills mount and the show cycles every `intervalMs`. It pauses while
 * the tab is hidden or the slideshow is out of view.
 */
export default function StillSlideshow({ images, intervalMs = 2000, label = "Selected photographs" }: Props) {
  const [run, setRun] = useState(false);
  const [cur, setCur] = useState(0);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const reduced = window.matchMedia(REDUCED_QUERY);
    const update = () => setRun(desktop.matches && !reduced.matches);
    update();
    desktop.addEventListener("change", update);
    reduced.addEventListener("change", update);
    return () => {
      desktop.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([en]) => setInView(en.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onVis = () => setTabVisible(!document.hidden);
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const playing = run && inView && tabVisible && images.length > 1;
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setCur((c) => (c + 1) % images.length), intervalMs);
    return () => window.clearInterval(id);
  }, [playing, images.length, intervalMs]);

  // Back to the first still when the show stops being a show (resized to a phone width, motion turned off).
  useEffect(() => {
    if (!run) setCur(0);
  }, [run]);

  return (
    <div className="stills" ref={rootRef} role="group" aria-roledescription="slideshow" aria-label={label} data-index={cur} data-count={images.length}>
      {images.map((src, i) =>
        i === 0 || run ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            width={1600}
            height={1067}
            className={i === cur ? "is-on" : undefined}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : undefined}
            decoding="async"
            draggable={false}
          />
        ) : null
      )}
    </div>
  );
}
