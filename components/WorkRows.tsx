"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Project } from "@/lib/projects";

export default function WorkRows({
  projects,
  startIndex = 1,
}: {
  projects: Project[];
  startIndex?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const rows = Array.from(container.querySelectorAll<HTMLAnchorElement>(".work-row"));
    const scrollRoot = document.getElementById("scrollRoot") as HTMLDivElement | null;
    if (!scrollRoot) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const i = rows.indexOf(entry.target as HTMLAnchorElement);
            window.setTimeout(() => entry.target.classList.add("in"), i * 100);
            io.unobserve(entry.target);
          }
        });
      },
      { root: scrollRoot, threshold: 0.1 }
    );
    rows.forEach((r) => io.observe(r));
    return () => io.disconnect();
  }, []);

  return (
    <div className="work-rows" ref={containerRef}>
      {projects.map((p, i) => (
        <Link
          key={p.slug}
          href={`/work/${p.slug}`}
          className="work-row reveal"
          onMouseEnter={(e) => {
            const v = (e.currentTarget.querySelector("video") as HTMLVideoElement) || null;
            if (v) {
              const promise = v.play();
              if (promise && promise.catch) promise.catch(() => {});
            }
          }}
        >
          <div className="work-row-num">
            {String(startIndex + i).padStart(2, "0")}
          </div>
          <div className="work-row-title-wrap">
            <div className="work-row-title">{p.title}</div>
            <div className="work-row-sub">{p.subtitle}</div>
          </div>
          <div className="work-row-desc">{p.shortDescription}</div>
          <div className="work-row-tag">{p.tag}</div>
          <div className="work-row-year">{p.year}</div>
          <div className="work-row-arrow">→</div>
          <div className="work-row-cover" aria-hidden="true">
            <video src={p.previewVideo} muted loop playsInline preload="auto" />
          </div>
        </Link>
      ))}
    </div>
  );
}
