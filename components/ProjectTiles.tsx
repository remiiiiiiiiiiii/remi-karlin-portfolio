"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import PreviewVideo from "./PreviewVideo";
import { useCanHover, useCenterMost } from "./playback";
import { getFeaturedProjects, isHidden } from "./landing-data";
import { getPreviewVideos } from "@/lib/projects";

export type Tile = {
  slug: string;
  title: string;
  subtitle: string;
  tag: string;
  year: string;
  previewVideo: string;
  previewVideos: string[];
};

const MAX_PLAYING_TOUCH = 2;

/** Poster until it plays; then cycles through the project's preview clips. */
function TileMedia({ srcs, playing }: { srcs: string[]; playing: boolean }) {
  const [i, setI] = useState(0);
  const multi = srcs.length > 1;
  return (
    <PreviewVideo
      src={srcs[i % srcs.length]}
      playing={playing}
      loop={!multi}
      onEnded={multi ? () => setI((n) => (n + 1) % srcs.length) : undefined}
    />
  );
}

export default function ProjectTiles({ tiles }: { tiles: Tile[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canHover = useCanHover();
  const [hovered, setHovered] = useState<string | null>(null);

  // data/projects.json `featured` (ascending) wins over the page's LANDING_ORDER; `hidden` is always excluded.
  const list = useMemo<Tile[]>(() => {
    const featured = getFeaturedProjects();
    if (featured.length) {
      return featured.map((p) => ({
        slug: p.slug,
        title: p.title,
        subtitle: p.subtitle,
        tag: p.tag,
        year: p.year,
        previewVideo: p.previewVideo,
        previewVideos: getPreviewVideos(p),
      }));
    }
    return tiles.filter((t) => !isHidden(t.slug));
  }, [tiles]);

  // touch: the (at most 2) tiles closest to the centre of #scrollRoot that are >=60% visible
  const inView = useCenterMost(containerRef, "[data-tile]", !canHover, MAX_PLAYING_TOUCH, 0.6);

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
  }, [list]);

  return (
    <div className="projects" id="projects" ref={containerRef}>
      {list.map((p) => {
        const srcs = p.previewVideos.length ? p.previewVideos : [p.previewVideo];
        const playing = canHover ? hovered === p.slug : inView.includes(p.slug);
        return (
          <Link
            key={p.slug}
            href={`/work/${p.slug}`}
            className="tile"
            data-tile
            data-row
            data-key={p.slug}
            onMouseEnter={canHover ? () => setHovered(p.slug) : undefined}
            onMouseLeave={canHover ? () => setHovered((h) => (h === p.slug ? null : h)) : undefined}
            onFocus={canHover ? () => setHovered(p.slug) : undefined}
            onBlur={canHover ? () => setHovered((h) => (h === p.slug ? null : h)) : undefined}
          >
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
              <TileMedia srcs={srcs} playing={playing} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
