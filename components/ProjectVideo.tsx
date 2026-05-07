"use client";

import { useState } from "react";

type Props = {
  youtubeId?: string;
  localVideo?: string;
  previewVideo?: string;
  title?: string;
};

export default function ProjectVideo({ youtubeId, localVideo, previewVideo, title }: Props) {
  const hasYouTube = youtubeId && youtubeId !== "YOUR_YOUTUBE_ID";
  // If local video fails to load (e.g. in production), fall back to YouTube / preview
  const [localFailed, setLocalFailed] = useState(false);

  // Local full-quality file (only if it loaded successfully)
  if (localVideo && !localFailed) {
    return (
      <div className="project-video-frame" aria-label={title}>
        <video
          src={localVideo}
          controls
          playsInline
          preload="metadata"
          poster={previewVideo}
          onError={() => setLocalFailed(true)}
        />
      </div>
    );
  }

  // YouTube embed
  if (hasYouTube) {
    return (
      <div className="project-video-frame" aria-label={title}>
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`}
          title={title || "Video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // Fallback: muted preview loop
  return (
    <div className="project-video-frame" aria-label={title}>
      <video
        src={previewVideo}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
      />
    </div>
  );
}
