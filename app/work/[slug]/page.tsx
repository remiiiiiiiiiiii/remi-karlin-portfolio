import { notFound } from "next/navigation";
import Link from "next/link";
import { projects, getPreviewVideos } from "@/lib/projects";
import Footer from "@/components/Footer";
import ProjectVideo from "@/components/ProjectVideo";
import ScrollReveal from "@/components/ScrollReveal";
import BackButton from "@/components/BackButton";
import CyclingVideo from "@/components/CyclingVideo";
import PhotoCarousel from "@/components/PhotoCarousel"; // used by modessec + fan-yan sections

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const p = projects.find((x) => x.slug === params.slug);
  if (!p) return { title: "Not found" };
  return {
    title: `${p.title} — Remi Karlin`,
    description: p.shortDescription,
  };
}

export default function ProjectPage({ params }: { params: { slug: string } }) {
  const idx = projects.findIndex((p) => p.slug === params.slug);
  if (idx === -1) notFound();
  const project = projects[idx];
  const prev = idx > 0 ? projects[idx - 1] : null;
  const next = idx < projects.length - 1 ? projects[idx + 1] : null;

  const heroVideo = project.videos[0];

  return (
    <main className="page project-page">
      <BackButton />
      {/* Full-viewport hero with title/info overlaid at bottom-left */}
      <div className="project-hero">
        <div className="project-video-frame">
          <CyclingVideo srcs={getPreviewVideos(project)} />
        </div>

        <div className="project-hero-overlay">
          <div className="project-hero-inner">
            <div className="project-hero-eyebrow">{project.tag}</div>
            <h1 className="project-hero-title">{project.title}</h1>
            {project.subtitle && (
              <div className="project-hero-tagline">{project.subtitle}</div>
            )}
            <div className="project-hero-meta">
              <span>{project.year}</span>
              <span>{project.location}</span>
              {project.roles.length > 0 && (
                <span>{project.roles.join(" · ")}</span>
              )}
            </div>
            <p className="project-hero-desc">{project.description}</p>
          </div>
        </div>
      </div>

      {/* Credits */}
      <section className="project-body">
        <ScrollReveal className="project-credits">
          <dl>
            {Object.entries(project.credits).map(([k, v]) => (
              <ProjectCreditRow key={k} label={k} value={v} />
            ))}
          </dl>
        </ScrollReveal>
      </section>

      {/* Project-specific extra content */}


      {/* All videos — full quality, shown when scrolling */}
      {project.videos.length > 0 && (
        <section className="project-section">
          <div className="project-section-label">
            {project.videos.length === 1 ? "Full Video" : "Videos"}
          </div>
          {project.videos.map((v, i) => (
            <ScrollReveal key={`${v.title}-${i}`} delay={i * 100} className="project-additional-video">
              <h3 className="project-additional-video-title">{v.title}</h3>
              <ProjectVideo
                youtubeId={v.youtubeId}
                localVideo={v.localVideo}
                previewVideo={v.previewVideo}
                title={v.title}
              />
              {v.description && (
                <div className="project-additional-video-caption">{v.description}</div>
              )}
            </ScrollReveal>
          ))}
        </section>
      )}

      {/* Modessec — hoodie photography carousel, after all videos */}
      {project.slug === "modessec" && (
        <section className="project-section">
          <ScrollReveal>
            <div className="project-section-label">Hoodie product photography (2024)</div>
            <PhotoCarousel
              images={Array.from({ length: 29 }, (_, i) => {
                const n = 303 + i;
                return `/images/modessec/NDLE_2024_RK_-${n}.jpg`;
              })}
              alt="Modessec hoodie"
            />
          </ScrollReveal>
        </section>
      )}

      {/* Fan Yan — lamp photography carousel, after all videos */}
      {project.slug === "fan-yan" && (
        <section className="project-section">
          <ScrollReveal>
            <div className="project-section-label">Artwork product photography</div>
            <PhotoCarousel
              images={[
                "/images/fan-yan/P1129581.jpg",
                "/images/fan-yan/P1129582.jpg",
                "/images/fan-yan/P1129583.jpg",
                "/images/fan-yan/P1129585.jpg",
                "/images/fan-yan/P1129586.jpg",
                "/images/fan-yan/P1129587.jpg",
                "/images/fan-yan/P1129592.jpg",
                "/images/fan-yan/P1129595.jpg",
                "/images/fan-yan/P1129599.jpg",
                "/images/fan-yan/P1129600.jpg",
              ]}
              alt="Fan Yan lamp"
            />
          </ScrollReveal>
        </section>
      )}

      <nav className="project-prev-next" aria-label="Project navigation">
        <div>
          {prev && (
            <Link href={`/work/${prev.slug}`}>
              <div className="pn-label">← Previous</div>
              <div className="pn-title">{prev.title}</div>
            </Link>
          )}
        </div>
        <div className="pn-right">
          {next && (
            <Link href={`/work/${next.slug}`}>
              <div className="pn-label">Next →</div>
              <div className="pn-title">{next.title}</div>
            </Link>
          )}
        </div>
      </nav>

      <Footer />
    </main>
  );
}

function ProjectCreditRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function ImageGrid({ images, placeholder }: { images: string[]; placeholder: string }) {
  if (!images || images.length === 0) {
    return (
      <div className="image-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="image-placeholder">{placeholder}</div>
        ))}
      </div>
    );
  }
  return (
    <div className="image-grid">
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={src} alt={`${placeholder} ${i + 1}`} />
      ))}
    </div>
  );
}
