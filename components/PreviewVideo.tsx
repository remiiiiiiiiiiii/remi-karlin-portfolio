"use client";

import { useEffect, useRef, useState } from "react";
import { posterPath } from "@/lib/posters";

/** "/videos/solene-preview.mp4" -> "/videos/posters/solene-preview.webp" */
export function posterFor(src: string, tiny = false): string {
  return posterPath(src, tiny);
}

/**
 * True when the user asked for reduced motion or Save-Data. Never plays video then.
 * null = not resolved yet (SSR and first commit): treated as "do not play, do not set src".
 */
export function useStayStill(): boolean | null {
  const [still, setStill] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
    const update = () => setStill(mq.matches || !!conn?.saveData);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return still;
}

type Props = {
  src: string;
  /** Defaults to the poster derived from `src`. */
  poster?: string;
  playing: boolean;
  className?: string;
  style?: React.CSSProperties;
  fit?: "cover" | "contain";
  /** Eager poster (above the fold / LCP). */
  priority?: boolean;
  /** Download the clip now without playing it (use for the one clip that is about to play). */
  warm?: boolean;
  /** Default true. Set false and use onEnded to chain clips. */
  loop?: boolean;
  onEnded?: () => void;
  /** When `playing` turns false, keep the paused frame visible instead of fading back to the poster. */
  holdFrame?: boolean;
};

export default function PreviewVideo({
  src,
  poster,
  playing,
  className,
  style,
  fit,
  priority = false,
  warm = false,
  loop = true,
  onEnded,
  holdFrame = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const still = useStayStill();
  const ready = still === false;
  const want = playing && ready;
  const warming = warm && ready;
  const [activated, setActivated] = useState(false);
  const [started, setStarted] = useState(false);
  // src only while the clip plays or is being warmed; holdFrame keeps it once it has played
  const mounted = want || warming || (holdFrame && activated);

  useEffect(() => {
    if (want) setActivated(true);
  }, [want]);

  // New clip: go back to the poster until the new clip is actually playing.
  const lastSrc = useRef(src);
  useEffect(() => {
    if (lastSrc.current !== src) {
      lastSrc.current = src;
      setStarted(false);
    }
  }, [src]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.setAttribute("muted", "");
    if (want) {
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    } else {
      v.pause();
      if (!holdFrame) setStarted(false);
    }
  }, [want, src, holdFrame]);

  // src was dropped: release the buffered media (the poster layer underneath stays visible)
  useEffect(() => {
    if (mounted) return;
    const v = videoRef.current;
    if (v && v.currentSrc) v.load();
  }, [mounted]);

  // object-fit comes from CSS (.pv-img / .pv-video = cover) unless a caller overrides it
  const objectFit = fit ? ({ objectFit: fit } as const) : undefined;

  return (
    <div className={className ? `pv ${className}` : "pv"} style={style} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="pv-img"
        src={poster ?? posterFor(src)}
        alt=""
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        {...(priority ? { fetchPriority: "high" as const } : {})}
        draggable={false}
        style={{ ...objectFit, backgroundImage: `url(${posterFor(src, true)})` }}
      />
      <video
        ref={videoRef}
        className="pv-video"
        src={mounted ? src : undefined}
        muted
        playsInline
        loop={loop}
        preload={want || warming ? "auto" : mounted ? "metadata" : "none"}
        controls={false}
        disablePictureInPicture
        tabIndex={-1}
        onPlaying={() => setStarted(true)}
        onEnded={onEnded}
        style={{ ...objectFit, opacity: started ? 1 : 0 }}
      />
    </div>
  );
}
