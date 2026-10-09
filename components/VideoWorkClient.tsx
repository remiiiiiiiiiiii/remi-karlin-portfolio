"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "@/lib/projects";
import { getPreviewVideos } from "@/lib/projects";
import PreviewVideo from "./PreviewVideo";
import { useCanHover, useCenterMost } from "./playback";

type Flagged = Project & { hidden?: boolean };

/** One background layer: poster always, plays (and cycles the project's previews) only while active. */
function BgLayer({ project, active, leaving }: { project: Project; active: boolean; leaving: boolean }) {
  const srcs = getPreviewVideos(project);
  const [i, setI] = useState(0);
  const multi = srcs.length > 1;
  return (
    <PreviewVideo
      src={srcs[i % srcs.length]}
      playing={active}
      loop={!multi}
      onEnded={multi ? () => setI((n) => (n + 1) % srcs.length) : undefined}
      // hover in is instant, hover out dissolves (0.3s to another row, 0.5s when leaving the list)
      style={{
        opacity: active ? 1 : 0,
        transition: active ? "none" : `opacity ${leaving ? "0.5s" : "0.3s"} ease`,
      }}
    />
  );
}

export default function VideoWorkClient({
  film: filmAll,
  travel: travelAll,
}: {
  film: Project[];
  travel: Project[];
}) {
  const film = (filmAll as Flagged[]).filter((p) => !p.hidden);
  const travel = (travelAll as Flagged[]).filter((p) => !p.hidden);
  const allProjects = [...film, ...travel];
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canHover = useCanHover();
  const [hovered, setHovered] = useState<string | null>(null);
  // layers are mounted lazily, the first time a row becomes active; nothing downloads before that
  const [seen, setSeen] = useState<string[]>([]);

  // touch: the one row closest to the centre of #scrollRoot (>=60% visible)
  const touchActive = useCenterMost(containerRef, ".work-row", !canHover, 1, 0.6)[0] ?? null;
  const active = canHover ? hovered : touchActive;

  useEffect(() => {
    if (active) setSeen((s) => (s.includes(active) ? s : [...s, active]));
  }, [active]);

  const showVideo = useCallback((slug: string) => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setHovered(slug);
  }, []);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setHovered(null), 500);
  }, []);

  // Reveal-on-scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const rows = Array.from(container.querySelectorAll<HTMLElement>(".work-row"));
    const scrollRoot = document.getElementById("scrollRoot") as HTMLDivElement | null;
    if (!scrollRoot) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const i = rows.indexOf(entry.target as HTMLElement);
            window.setTimeout(() => entry.target.classList.add("in"), i * 80);
            io.unobserve(entry.target);
          }
        });
      },
      { root: scrollRoot, threshold: 0.08 }
    );
    rows.forEach((r) => io.observe(r));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const renderRow = (p: Project, idx: number) => (
    <Link
      key={p.slug}
      href={`/work/${p.slug}`}
      className="work-row reveal"
      data-key={p.slug}
      onMouseEnter={() => canHover && showVideo(p.slug)}
      onFocus={() => canHover && showVideo(p.slug)}
    >
      <div className="work-row-num">{String(idx + 1).padStart(2, "0")}</div>
      <div className="work-row-title-wrap">
        <div className="work-row-title">{p.title}</div>
        <div className="work-row-sub">{p.subtitle}</div>
      </div>
      <div className="work-row-desc">{p.shortDescription}</div>
      <div className="work-row-tag">{p.tag}</div>
      <div className="work-row-year">{p.year}</div>
    </Link>
  );

  return (
    <>
      {/* Posters mount on first hover and videos only play for the active row */}
      <div className="vw-bg" aria-hidden="true">
        {allProjects
          .filter((p) => seen.includes(p.slug))
          .map((p) => (
            <BgLayer key={p.slug} project={p} active={active === p.slug} leaving={active === null} />
          ))}
      </div>
      <div className="vw-bg-overlay" aria-hidden="true" />
      <div className="vw-top-grad" aria-hidden="true" />

      {/* z-index: 10 keeps rows above overlay and gradient */}
      <div ref={containerRef} onMouseLeave={scheduleHide} style={{ position: "relative", zIndex: 10 }}>
        <div className="work-rows">
          <div className="work-row-section-label">Film &amp; Direction</div>
          {film.map((p, i) => renderRow(p, i))}
        </div>

        <div className="work-rows">
          <div className="work-row-section-label">Travel &amp; Personal</div>
          {travel.map((p, i) => renderRow(p, film.length + i))}
        </div>
      </div>
    </>
  );
}
