"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  youtubeId?: string;
  /** Accepted for API compatibility but ignored: local files are not deployed. */
  localVideo?: string;
  previewVideo?: string;
  title?: string;
  /** First video on the page: mount the player once it scrolls into view. */
  priority?: boolean;
};

export default function ProjectVideo({ youtubeId, previewVideo, title, priority = false }: Props) {
  const hasYouTube = !!youtubeId && youtubeId !== "YOUR_YOUTUBE_ID";
  const [active, setActive] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [thumb, setThumb] = useState<"maxresdefault" | "hqdefault">("maxresdefault");
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // First video on the page: load the player (no autoplay) when it is in view.
  useEffect(() => {
    if (!priority || !hasYouTube || active) return;
    const el = frameRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setActive(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [priority, hasYouTube, active]);

  // maxresdefault does not exist for every video; fall back if it already failed pre-hydration.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth <= 120 && thumb === "maxresdefault") {
      setThumb("hqdefault");
    }
  }, [thumb]);

  // After a click, hand keyboard focus to the player that replaced the button.
  useEffect(() => {
    if (autoplay && active) iframeRef.current?.focus();
  }, [autoplay, active]);

  if (hasYouTube) {
    return (
      <div className="project-video-frame" aria-label={title} ref={frameRef}>
        {active ? (
          <iframe
            ref={iframeRef}
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1${
              autoplay ? "&autoplay=1" : ""
            }`}
            title={title || "Video"}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className="pv-facade"
            aria-label={`Play ${title || "video"}`}
            onClick={() => {
              setAutoplay(true);
              setActive(true);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={`https://i.ytimg.com/vi/${youtubeId}/${thumb}.jpg`}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setThumb("hqdefault")}
            />
            <span className="pv-play" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M6 3.5v17l14-8.5z" />
              </svg>
            </span>
          </button>
        )}
      </div>
    );
  }

  // No YouTube id: muted preview loop
  return (
    <div className="project-video-frame" aria-label={title}>
      <video src={previewVideo} muted loop playsInline autoPlay preload="auto" />
    </div>
  );
}
