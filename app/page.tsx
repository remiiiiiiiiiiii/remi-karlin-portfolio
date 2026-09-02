import projectsData from "@/data/projects.json";
import Hero from "@/components/Hero";
import ProjectTiles, { Tile } from "@/components/ProjectTiles";
import Footer from "@/components/Footer";
import { getPreviewVideos } from "@/lib/projects";
import type { Project } from "@/lib/projects";

export default function Page() {
  const LANDING_ORDER = [
    "fan-yan",
    "solene",
    "hong-kong",
    "b1nbags",
    "modessec",
    "rmx",
    "ruinarktefact",
    "spain",
  ];

  const projectMap = Object.fromEntries(projectsData.projects.map((p) => [p.slug, p]));
  const tiles: Tile[] = LANDING_ORDER.map((slug) => projectMap[slug]).filter(Boolean).map((p) => ({
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle,
    tag: p.tag,
    year: p.year,
    previewVideo: p.previewVideo,
    previewVideos: getPreviewVideos(p as unknown as Project),
  }));

  return (
    <>
      <Hero />

      <main className="page">
        <section className="hero-text" aria-hidden="true" />

        <section id="work" className="work-section">
          <div className="section-head">
            <div className="section-eyebrow">Selected Projects</div>
            <div className="section-meta">2023 — 2025 · {tiles.length} Works</div>
          </div>
          <ProjectTiles tiles={tiles} />
        </section>

        <section className="about" id="about">
          <div>
            <div className="about-eyebrow">About</div>
            <div className="about-copy">
              <p>
                Remi Karlin is a filmmaker and cinematographer working between Hong Kong and Paris.
                His work spans short documentary, brand films, fashion events and travel
                cinematography, with a focus on light, texture and the quiet rhythm of a place.
              </p>
              <p>
                He shoots, edits and grades end-to-end — building the visual language of each
                project from the first scout to the final master.
              </p>
            </div>
          </div>
          <dl className="credits">
            <dt>Based</dt>
            <dd>
              Hong Kong / Paris
              <small>Available worldwide</small>
            </dd>
            <dt>Camera</dt>
            <dd>
              Lumix S5II
              <small>Lumix 20–60mm f/3.5–5.6</small>
            </dd>
            <dt>Post</dt>
            <dd>
              DaVinci Resolve
              <small>Color · Edit · Finish</small>
            </dd>
            <dt>Email</dt>
            <dd>
              remikarlin@gmail.com
              <small>Reply within 48h</small>
            </dd>
          </dl>
        </section>

        <Footer />
      </main>
    </>
  );
}
