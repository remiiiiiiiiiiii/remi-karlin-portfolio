"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import CyclingVideo from "./CyclingVideo";

export type Tile = {
  slug: string;
  title: string;
  subtitle: string;
  tag: string;
  year: string;
  previewVideo: string;
  previewVideos: string[];
};

export default function ProjectTiles({ tiles }: { tiles: Tile[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const tileEls = Array.from(container.querySelectorAll<HTMLAnchorElement>("[data-tile]"));
    const scrollRoot = document.getElementById("scrollRoot") as HTMLDivElement | null;
    if (!scrollRoot) return;


    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = tileEls.indexOf(entry.target as HTMLAnchorElement);
            window.setTimeout(() => entry.target.classList.add("in"), idx * 100);
            io.unobserve(entry.target);
          }
        });
      },
      { root: scrollRoot, threshold: 0.1 }
    );
    tileEls.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="projects" id="projects" ref={containerRef}>
      {tiles.map((p) => (
        <Link key={p.slug} href={`/work/${p.slug}`} className="tile" data-tile data-row>
          <div className="tile-meta">
            <div className="tile-meta-left">
              <div className="tile-title">{p.title}</div>
              <div className="tile-sub">{p.subtitle}</div>
            </div>
            <div className="tile-meta-right">
              <div className="tile-tag">{p.tag}</div>
              <div className="tile-year">{p.year}</div>
            </div>
          </div>
          <div className="tile-media">
            <CyclingVideo srcs={p.previewVideos} />
          </div>
        </Link>
      ))}
    </div>
  );
}
