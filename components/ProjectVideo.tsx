"use client";

import { useEffect, useRef, useState } from "react";
import { posterPath } from "@/lib/posters";

type Props = {
  youtubeId?: string;
  /** Self-hosted film (e.g. /videos/full/<slug>-<n>.mp4). Used when there is no youtubeId. */
  localVideo?: string;
  previewVideo?: string;
  title?: string;
  /** "9:16" | "4:5" | "1:1" | "16:9" | "3:2" | "other". Sizes the native player and the pending poster. */
  aspect?: string;
  /** YouTube film that is not uploaded yet: poster plus a small label, no player. */
  pending?: boolean;
  /** First video on the page: mount the player once it scrolls into view. */
  priority?: boolean;
};

export default function ProjectVideo({
  youtubeId,
  localVideo,
  previewVideo,
  title,
  aspect,
  pending = false,
  priority = false,
}: Props) {
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

  const poster = previewVideo ? posterPath(previewVideo) : undefined;
  const aspectKey = aspect || "16:9";

  // Self-hosted film: native player, never autoplays, nothing downloads until the first play.
  if (localVideo) {
    return (
      <div className="pv-native" data-aspect={aspectKey} aria-label={title}>
        <video
          src={localVideo}
          poster={poster}
          controls
          playsInline
          preload="none"
          controlsList="nodownload"
          aria-label={title || "Video"}
        />
      </div>
    );
  }

  // YouTube film that is not uploaded yet: poster and a label, no player.
  if (pending) {
    return (
      <div className="pv-native pv-pending" data-aspect={aspectKey} aria-label={title}>
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" loading="lazy" decoding="async" draggable={false} />
        )}
        <span className="pv-pending-label">Full film coming soon</span>
      </div>
    );
  }

  // Neither: muted preview loop
  return (
    <div className="project-video-frame" aria-label={title}>
      <video src={previewVideo} muted loop playsInline autoPlay preload="auto" />
    </div>
  );
}
