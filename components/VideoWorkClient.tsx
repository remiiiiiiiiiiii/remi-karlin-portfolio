"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import type { Project } from "@/lib/projects";
import { getPreviewVideos } from "@/lib/projects";

export default function VideoWorkClient({
  film,
  travel,
}: {
  film: Project[];
  travel: Project[];
}) {
  const allProjects = [...film, ...travel];
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const currentSlug = useRef<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build per-project preview cycle lists
  const previewCycles = useRef<Map<string, { srcs: string[]; idx: number }>>(new Map());
  useEffect(() => {
    allProjects.forEach((p) => {
      previewCycles.current.set(p.slug, {
        srcs: getPreviewVideos(p),
        idx: 0,
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start every video silently and wire up cycling on ended
  useEffect(() => {
    videoRefs.current.forEach((v, slug) => {
      const play = () => {
        const p = v.play();
        if (p?.catch) p.catch(() => {});
      };
      play();

      const cycle = previewCycles.current.get(slug);
      if (!cycle || cycle.srcs.length <= 1) return;
      v.addEventListener("ended", () => {
        cycle.idx = (cycle.idx + 1) % cycle.srcs.length;
        const isVisible = v.style.opacity === "1";
        if (isVisible) {
          // Keep looping so it never freezes on the last frame during dissolve
          v.loop = true;
          v.style.transition = "opacity 400ms ease";
          v.style.opacity = "0";
          setTimeout(() => {
            v.loop = false;
            v.src = cycle.srcs[cycle.idx];
            v.play().catch(() => {});
            setTimeout(() => {
              v.style.transition = "opacity 400ms ease";
              v.style.opacity = "1";
            }, 60);
          }, 420);
        } else {
          v.src = cycle.srcs[cycle.idx];
          v.play().catch(() => {});
        }
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showVideo = useCallback((slug: string) => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    if (slug === currentSlug.current) return;

    // Hide outgoing — fade to black over 0.3s
    if (currentSlug.current) {
      const prev = videoRefs.current.get(currentSlug.current);
      if (prev) {
        prev.style.transition = "opacity 0.3s ease";
        prev.style.opacity = "0";
      }
    }

    // Show incoming — instant, no transition
    const next = videoRefs.current.get(slug);
    if (next) {
      next.style.transition = "none";
      next.style.opacity = "1";
    }

    currentSlug.current = slug;
  }, []);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (currentSlug.current) {
        const v = videoRefs.current.get(currentSlug.current);
        if (v) {
          v.style.transition = "opacity 0.5s ease";
          v.style.opacity = "0";
        }
        currentSlug.current = null;
      }
    }, 500);
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
      onMouseEnter={() => showVideo(p.slug)}
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
      {/* All videos playing silently — hover is a pure opacity flip */}
      <div className="vw-bg" aria-hidden="true">
        {allProjects.map((p) => (
          <video
            key={p.slug}
            ref={(el) => {
              if (el) videoRefs.current.set(p.slug, el);
              else videoRefs.current.delete(p.slug);
            }}
            src={p.previewVideo}
            muted
            loop
            playsInline
            preload="auto"
            style={{ opacity: 0 }}
          />
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
