"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PreviewVideo, { posterFor } from "./PreviewVideo";

type Props = {
  srcs: string[];
  style?: React.CSSProperties;
  /** Poster image shown before the first clip plays. Defaults to the one derived from srcs[0]. */
  poster?: string;
  /** Eager poster for the first clip (it is usually the LCP on project pages). Default true. */
  priority?: boolean;
};

const FADE_MS = 800;

/**
 * Project-page hero. Shows the real poster of the first clip, plays it, then cross-fades to the
 * next clip when one ends. Only the active clip, the next clip (preloaded) and, during the
 * dissolve, the outgoing clip are mounted.
 */
export default function CyclingVideo({ srcs, style, poster, priority = true }: Props) {
  const n = srcs.length;
  const [idx, setIdx] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [warmNext, setWarmNext] = useState(false);
  const fadeTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(fadeTimer.current), []);

  // preload the next clip once the current one has had a head start
  useEffect(() => {
    if (n < 2) return;
    const t = window.setTimeout(() => setWarmNext(true), 1500);
    return () => window.clearTimeout(t);
  }, [idx, n]);

  const advance = useCallback(() => {
    if (n < 2) return;
    setPrev(idx);
    setIdx((idx + 1) % n);
    setWarmNext(false);
    window.clearTimeout(fadeTimer.current);
    fadeTimer.current = window.setTimeout(() => setPrev(null), FADE_MS + 100);
  }, [idx, n]);

  if (n === 0) return null;

  const next = (idx + 1) % n;
  const layers = [prev, idx, n > 1 ? next : null].filter(
    (v, i, a): v is number => v !== null && a.indexOf(v) === i
  );

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", ...style }}>
      {layers.map((i) => {
        const isCurrent = i === idx;
        return (
          <PreviewVideo
            key={srcs[i]}
            src={srcs[i]}
            poster={i === 0 && poster ? poster : posterFor(srcs[i])}
            // the outgoing clip keeps playing through the dissolve so it never freezes on its last frame
            playing={isCurrent || i === prev}
            warm={!isCurrent && i === next && warmNext}
            priority={priority && i === 0}
            loop={n === 1}
            onEnded={isCurrent && n > 1 ? advance : undefined}
            holdFrame
            style={{
              position: "absolute",
              inset: 0,
              opacity: isCurrent ? 1 : 0,
              filter: "saturate(0.95) contrast(1.04)",
              transition: `opacity ${FADE_MS}ms ease-in-out`,
            }}
          />
        );
      })}
    </div>
  );
}
