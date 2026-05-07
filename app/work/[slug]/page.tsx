import { notFound } from "next/navigation";
import Link from "next/link";
import { projects, getPreviewVideos } from "@/lib/projects";
import Footer from "@/components/Footer";
import ProjectVideo from "@/components/ProjectVideo";
import ScrollReveal from "@/components/ScrollReveal";
import BackButton from "@/components/BackButton";
import CyclingVideo from "@/components/CyclingVideo";
import PhotoCarousel from "@/components/PhotoCarousel";

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

      {project.slug === "b1nbags" && (
        <section className="project-section">
          <ScrollReveal>
            <div className="project-section-label">Brand</div>
            <div className="project-section-body">
              <p>
                The pattern in the banner is built from scans of old Hong Kong dollar bills,
                edited in Photoshop. The Instagram carousel post was assembled in Photoshop and
                shared on the brand&apos;s social.
              </p>
              {project.instagramUrl && (
                <a
                  className="project-link"
                  href={project.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {project.instagram}
                </a>
              )}
            </div>
            {/* Banner — full bleed, cropped to a strip */}
            <div style={{
              width: "100vw",
              position: "relative",
              left: "50%",
              transform: "translateX(-50%)",
              marginTop: 32,
              height: "clamp(140px, 22vw, 320px)",
              overflow: "hidden",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/b1nbags/banner.png"
                alt="B1NBAGS banner"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
            {/* Instagram carousel post — full bleed, no crop */}
            <div style={{
              width: "100vw",
              position: "relative",
              left: "50%",
              transform: "translateX(-50%)",
              marginTop: 16,
              background: "#0a0a0a",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/b1nbags/instagram-grid.png"
                alt="B1NBAGS Instagram carousel"
                style={{ width: "100%", display: "block" }}
              />
            </div>
          </ScrollReveal>
        </section>
      )}

      {project.slug === "ruinarktefact" && (
        <section className="project-section">
          <ScrollReveal>
            <div className="project-section-label">Campaign</div>

            {/* Text left, mascot large + bottom-aligned on the right */}
            <div style={{ display: "flex", gap: 40, alignItems: "flex-end" }}>
              <div className="project-section-body" style={{ flex: 1 }}>
                {project.campaignBody && <p>{project.campaignBody}</p>}
                <div style={{ display: "flex", gap: 20, marginTop: 20, flexWrap: "wrap" }}>
                  <a
                    className="project-link"
                    href="https://www.youtube.com/@MickJaguarRkt"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ marginTop: 0 }}
                  >
                    YouTube — @MickJaguarRkt
                  </a>
                  <a
                    className="project-link"
                    href="https://instagram.com/itsmickjaguar"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ marginTop: 0 }}
                  >
                    Instagram — @itsmickjaguar
                  </a>
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: "center", marginTop: -60 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/ruinarktefact/mascot.png"
                  alt="Ruinarktefact mascot"
                  style={{ width: 340, display: "block" }}
                />
                <div style={{
                  marginTop: 10,
                  fontWeight: 300,
                  fontSize: 9,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--text-dim)",
                }}>
                  Mascot designed and coloured in Procreate and Illustrator
                </div>
              </div>
            </div>

            {/* Campaign name designs */}
            <div style={{ marginTop: 48 }}>
              <PhotoCarousel
                images={[
                  "/images/ruinarktefact/campaign-3d-no-bg.png",
                  "/images/ruinarktefact/campaign-3d.webp",
                  "/images/ruinarktefact/campaign-vrk-no-bg.png",
                  "/images/ruinarktefact/campaign-vrk.jpg",
                ]}
                alt="Campaign design"
                height="clamp(260px, 42vh, 520px)"
                slideWidth={72}
                sideOffset={78}
                sideScale={0.75}
                centerFit="cover"
              />
            </div>
            <div style={{
              marginTop: 14,
              fontWeight: 300,
              fontSize: 9,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--text-dim)",
            }}>
              Campaign name designs — Illustrator, Photoshop, Procreate, Firefly and Midjourney
            </div>
          </ScrollReveal>
        </section>
      )}

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
