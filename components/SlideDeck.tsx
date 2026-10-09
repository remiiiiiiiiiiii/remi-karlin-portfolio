"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  images: string[];
  alt: string;
  /** CSS aspect-ratio of every slide. Default "16 / 9". */
  aspect?: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * One-slide-at-a-time viewer. The slides sit in a horizontal scroll-snap track, so touch swipe works
 * natively; the buttons, keys and thumbnails just scroll that track, and the counter reads it back.
 */
export default function SlideDeck({ images, alt, aspect = "16 / 9" }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const total = images.length;

  const goTo = useCallback(
    (i: number) => {
      const track = trackRef.current;
      if (!track || total === 0) return;
      const target = Math.max(0, Math.min(total - 1, i));
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      track.scrollTo({ left: target * track.clientWidth, behavior: reduce ? "auto" : "smooth" });
      // Reflect the click straight away; the scroll handler keeps it in step afterwards.
      setCurrent(target);
    },
    [total]
  );

  // Counter follows the scroll position (swipe, buttons, keys, thumbnails all end up here).
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      if (track.clientWidth === 0) return;
      const i = Math.round(track.scrollLeft / track.clientWidth);
      setCurrent(Math.max(0, Math.min(total - 1, i)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [total]);

  // Keep the active thumbnail visible inside its own row (never scrolls the page).
  useEffect(() => {
    const row = thumbsRef.current;
    const el = row?.children[current] as HTMLElement | undefined;
    if (!row || !el) return;
    const left = el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2;
    row.scrollTo({ left, behavior: "auto" });
  }, [current]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(current + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(current - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      goTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      goTo(total - 1);
    }
  };

  if (total === 0) return null;

  return (
    <div
      className="slide-deck"
      tabIndex={0}
      role="group"
      aria-roledescription="carousel"
      aria-label={alt}
      onKeyDown={onKeyDown}
      style={{ ["--deck-aspect" as string]: aspect }}
    >
      <div className="slide-deck-track" ref={trackRef}>
        {images.map((src, i) => (
          <div
            className="slide-deck-slide"
            key={src}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${total}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`${alt} ${i + 1}`}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
            />
          </div>
        ))}
      </div>

      <div className="slide-deck-bar">
        <span className="slide-deck-count" aria-live="polite">
          {pad(current + 1)} / {pad(total)}
        </span>
        <div className="slide-deck-ctrl">
          <button type="button" onClick={() => goTo(current - 1)} disabled={current === 0} aria-label="Previous slide">
            Prev
          </button>
          <button type="button" onClick={() => goTo(current + 1)} disabled={current === total - 1} aria-label="Next slide">
            Next
          </button>
        </div>
      </div>

      <div className="slide-deck-thumbs" ref={thumbsRef}>
        {images.map((src, i) => (
          <button
            type="button"
            key={src}
            className={i === current ? "is-current" : undefined}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === current ? "true" : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" loading="lazy" decoding="async" draggable={false} />
            <span className="slide-deck-thumb-n">{pad(i + 1)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
