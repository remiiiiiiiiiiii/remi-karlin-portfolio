import { projects } from "@/lib/projects";
import VideoWorkClient from "@/components/VideoWorkClient";

export const metadata = {
  title: "Video Work — Remi Karlin",
  description: "All video work by Remi Karlin — film and direction, travel and personal.",
};

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
