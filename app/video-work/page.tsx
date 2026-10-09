import { projects } from "@/lib/projects";
import VideoWorkClient from "@/components/VideoWorkClient";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Cinematographer Portfolio, Hong Kong — Remi Karlin",
  description:
    "Documentary, music video, brand and event films shot, edited and graded by Remi Karlin. Cinematography based in Hong Kong, available in Paris.",
  path: "/video-work",
});

export default function VideoWorkPage() {
  const film = projects.filter((p) => p.category === "film");
  const travel = projects.filter((p) => p.category === "travel");

  return (
    <main className="page video-work-page">
      <header className="page-header">
        <div className="page-eyebrow">Video Work</div>
        <h1 className="page-title">All Work</h1>
      </header>

      <VideoWorkClient film={film} travel={travel} />
    </main>
  );
}
