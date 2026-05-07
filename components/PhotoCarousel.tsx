"use client";

import { useState, useCallback } from "react";

type Props = {
  images: string[];
  alt?: string;
  /** Height of the stage. Default: portrait photos. */
  height?: string;
  /** Width of the center slide as % of stage. Default 52. */
  slideWidth?: number;
  /** translateX offset (% of slide width) for side slides. Default 58. */
  sideOffset?: number;
  /** Scale of side slides. Default 0.82. */
  sideScale?: number;
  /** object-fit for center image. Default "contain". */
  centerFit?: "contain" | "cover";
};

export default function PhotoCarousel({
  images,
  alt = "Photo",
  height = "clamp(320px, 55vh, 580px)",
  slideWidth = 52,
  sideOffset = 58,
  sideScale = 0.82,
  centerFit = "contain",
}: Props) {
  const [current, setCurrent] = useState(0);

  const go = useCallback((dir: 1 | -1) => {
    setCurrent((c) => (c + dir + images.length) % images.length);
  }, [images.length]);

  return (
    <div style={{
      userSelect: "none",
      width: "100vw",
      position: "relative",
      left: "50%",
      transform: "translateX(-50%)",
    }}>
      {/* Slide stage */}
      <div style={{ position: "relative", width: "100%", height, overflow: "hidden" }}>
        {images.map((src, i) => {
          const offset = i - current;
          const isCenter = offset === 0;
          const visible = Math.abs(offset) <= 2;

          return (
            <div
              key={src}
              onClick={() => {
                if (offset === -1) go(-1);
                else if (offset === 1) go(1);
              }}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: `${slideWidth}%`,
                height: "90%",
                transform: `
                  translate(-50%, -50%)
                  translateX(${offset * sideOffset}%)
                  scale(${isCenter ? 1 : sideScale})
                `,
                transition: "transform 600ms cubic-bezier(0.16,1,0.3,1), opacity 400ms ease, filter 400ms ease",
                opacity: visible ? (isCenter ? 1 : 0.5) : 0,
                zIndex: isCenter ? 3 : 2 - Math.abs(offset),
                cursor: (offset === -1 || offset === 1) ? "none" : "default",
                overflow: "hidden",
                background: "#0a0a0a",
                filter: isCenter ? "none" : "brightness(0.55)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${alt} ${i + 1}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: isCenter ? centerFit : "cover",
                  display: "block",
                  transition: "transform 600ms cubic-bezier(0.16,1,0.3,1)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "scale(1.04)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                }}
              />
            </div>
          );
        })}

        {/* Arrow buttons */}
        {(["left", "right"] as const).map((side) => (
          <button
            key={side}
            onClick={() => go(side === "left" ? -1 : 1)}
            aria-label={side === "left" ? "Previous" : "Next"}
            style={{
              position: "absolute",
              [side]: 16,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              width: 36,
              height: 36,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              color: "rgba(255,255,255,0.8)",
              cursor: "none",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {side === "left" ? "←" : "→"}
          </button>
        ))}
      </div>

      {/* Dot indicator */}
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 20 }}>
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Go to photo ${i + 1}`}
            style={{
              width: i === current ? 20 : 5,
              height: 5,
              borderRadius: 999,
              background: i === current ? "#fff" : "rgba(255,255,255,0.2)",
              border: "none",
              padding: 0,
              cursor: "none",
              transition: "width 300ms cubic-bezier(0.16,1,0.3,1), background 240ms ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
