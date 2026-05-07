"use client";

import { useEffect, useRef } from "react";

type Props = {
  srcs: string[];
  style?: React.CSSProperties;
};

export default function CyclingVideo({ srcs, style }: Props) {
  const vidARef = useRef<HTMLVideoElement>(null);
  const vidBRef = useRef<HTMLVideoElement>(null);
  const activeSlot = useRef<"a" | "b">("a");
  const idxRef = useRef(0);
  const srcsRef = useRef(srcs);
  srcsRef.current = srcs;

  useEffect(() => {
    const vidA = vidARef.current;
    const vidB = vidBRef.current;
    if (!vidA) return;

    const p = vidA.play();
    if (p?.catch) p.catch(() => {});

    if (!vidB || srcsRef.current.length <= 1) return;

    const crossfade = (outgoing: HTMLVideoElement, incoming: HTMLVideoElement) => {
      // Keep outgoing looping so it never freezes on last frame during the dissolve
      outgoing.loop = true;

      // Advance index and load incoming
      idxRef.current = (idxRef.current + 1) % srcsRef.current.length;
      incoming.src = srcsRef.current[idxRef.current];
      incoming.currentTime = 0;
      const play = incoming.play();
      if (play?.catch) play.catch(() => {});

      // 60ms pre-roll so incoming has a live frame before becoming visible
      setTimeout(() => {
        incoming.style.opacity = "1";
        outgoing.style.opacity = "0";
        activeSlot.current = activeSlot.current === "a" ? "b" : "a";

        // After dissolve completes, stop the now-hidden outgoing video
        setTimeout(() => {
          outgoing.loop = false;
          outgoing.pause();
        }, 850);
      }, 60);
    };

    const onEndedA = () => { if (activeSlot.current === "a") crossfade(vidA, vidB); };
    const onEndedB = () => { if (activeSlot.current === "b") crossfade(vidB, vidA); };

    vidA.addEventListener("ended", onEndedA);
    vidB.addEventListener("ended", onEndedB);
    return () => {
      vidA.removeEventListener("ended", onEndedA);
      vidB.removeEventListener("ended", onEndedB);
    };
  }, []);

  const videoStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    filter: "saturate(0.95) contrast(1.04)",
    transition: "opacity 800ms ease-in-out, transform 900ms cubic-bezier(0.16,1,0.3,1), filter 600ms cubic-bezier(0.16,1,0.3,1)",
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", ...style }}>
      <video
        ref={vidARef}
        src={srcs[0]}
        muted
        autoPlay
        playsInline
        loop={srcs.length === 1}
        preload="auto"
        style={{ ...videoStyle, opacity: 1 }}
      />
      {srcs.length > 1 && (
        <video
          ref={vidBRef}
          src={srcs[1]}
          muted
          playsInline
          preload="auto"
          style={{ ...videoStyle, opacity: 0 }}
        />
      )}
    </div>
  );
}
