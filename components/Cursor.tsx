"use client";

import { useEffect, useRef } from "react";

export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(hover: none)").matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mx = -999;
    let my = -999;
    let dx = mx;
    let dy = my;
    let rx = mx;
    let ry = my;
    let hasMovedOnce = false;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!hasMovedOnce) {
        hasMovedOnce = true;
        dx = mx; dy = my; rx = mx; ry = my;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
      }
    };
    const onLeave = () => {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
      hasMovedOnce = false;
    };
    const onEnter = () => {
      // opacity set on first mousemove to avoid appearing at wrong position
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("mouseenter", onEnter);

    let raf = 0;
    const loop = () => {
      dx += (mx - dx) * 0.6;
      dy += (my - dy) * 0.6;
      dot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`;
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const hoverSelectors = "a, button, [data-row], [data-tile], .nav-link, .footer-link";
    const onOver = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest(hoverSelectors)) document.body.classList.add("is-hover");
    };
    const onOut = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest(hoverSelectors)) document.body.classList.remove("is-hover");
    };
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mouseenter", onEnter);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
    };
  }, []);

  return (
    <>
      <div className="cursor-ring" ref={ringRef} aria-hidden="true" style={{ opacity: 0 }} />
      <div className="cursor-dot" ref={dotRef} aria-hidden="true" style={{ opacity: 0 }} />
    </>
  );
}
