"use client";

import { useEffect, useState } from "react";
import type { RefObject } from "react";

/** True on devices with a real hover pointer (mouse / trackpad). False on touch. */
export function useCanHover(): boolean {
  const [can, setCan] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCan(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return can;
}

/**
 * Touch playback: returns the keys (data-key) of the `max` elements that are at least
 * `threshold` visible inside #scrollRoot, closest to the centre of the scroll area first.
 * Disabled -> always [].
 */
export function useCenterMost(
  containerRef: RefObject<HTMLElement>,
  selector: string,
  enabled: boolean,
  max: number,
  threshold = 0.6
): string[] {
  const [keys, setKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!enabled) {
      setKeys((k) => (k.length ? [] : k));
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    const root = document.getElementById("scrollRoot");
    const els = Array.from(container.querySelectorAll<HTMLElement>(selector));
    const visible = new Set<HTMLElement>();
    let raf = 0;

    const compute = () => {
      raf = 0;
      const r = root ? root.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
      const mid = (r.top + r.bottom) / 2;
      const next = Array.from(visible)
        .map((el) => {
          const b = el.getBoundingClientRect();
          return { key: el.dataset.key || "", d: Math.abs((b.top + b.bottom) / 2 - mid) };
        })
        .filter((x) => x.key)
        .sort((a, b) => a.d - b.d)
        .slice(0, max)
        .map((x) => x.key);
      setKeys((prev) => (prev.join("|") === next.join("|") ? prev : next));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const el = e.target as HTMLElement;
          if (e.isIntersecting && e.intersectionRatio >= threshold) visible.add(el);
          else visible.delete(el);
        });
        schedule();
      },
      { root, threshold: [0, threshold] }
    );
    els.forEach((el) => io.observe(el));
    const scrollTarget: HTMLElement | Window = root || window;
    scrollTarget.addEventListener("scroll", schedule, { passive: true });

    return () => {
      io.disconnect();
      scrollTarget.removeEventListener("scroll", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [containerRef, selector, enabled, max, threshold]);

  return enabled ? keys : [];
}
