"use client";

import { useState } from "react";

type Props = {
  /** iframe URL from Milanote's embed code. Empty = no live frame. */
  src: string;
  title: string;
  /** Read-only board link, shown as "Open the board" under the frame. */
  boardUrl?: string;
  /** Full-board snapshot (scripts/snapshot-milanote.mjs). Shown first: the whole board at a glance. */
  snapshot?: { src: string; tiny?: string; width: number; height: number };
};

/**
 * Mood board: the snapshot of the whole board first (Milanote's read-only view opens at 100% on an
 * empty corner of a board this size), then the live board on request, in the same box.
 */
export default function MilanoteEmbed({ src, title, boardUrl, snapshot }: Props) {
  const [live, setLive] = useState(!snapshot);
  const canToggle = !!snapshot && !!src;

  return (
    <div className="mb-embed">
      <div className={live ? "mb-frame is-live" : "mb-frame"} style={snapshot && !live ? { aspectRatio: `${snapshot.width} / ${snapshot.height}` } : undefined}>
        {live && src ? (
          <iframe src={src} title={title} allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
        ) : snapshot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={snapshot.src}
            alt={title}
            width={snapshot.width}
            height={snapshot.height}
            loading="lazy"
            decoding="async"
            draggable={false}
            style={snapshot.tiny ? { backgroundImage: `url(${snapshot.tiny})` } : undefined}
          />
        ) : null}
      </div>
      <div className="mb-caption">
        <span>Mood board on Milanote</span>
        {canToggle && (
          <button type="button" onClick={() => setLive((v) => !v)}>
            {live ? "Back to the overview" : "Explore the live board"}
          </button>
        )}
        {boardUrl && (
          <a href={boardUrl} target="_blank" rel="noreferrer">
            Open the board
          </a>
        )}
      </div>
    </div>
  );
}
