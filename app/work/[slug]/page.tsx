import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { projects, getPreviewVideos } from "@/lib/projects";
import {
  SITE_URL,
  PERSON_ID,
  POSTER_WIDTH,
  POSTER_HEIGHT,
  getProjectSeo,
  jsonLdScript,
  pageMeta,
  posterFor,
  projectSection,
} from "@/lib/seo";
import Footer from "@/components/Footer";
import ProjectVideo from "@/components/ProjectVideo";
import ScrollReveal from "@/components/ScrollReveal";
import BackButton from "@/components/BackButton";
import CyclingVideo from "@/components/CyclingVideo";
import PhotoCarousel from "@/components/PhotoCarousel"; // used by modessec + fan-yan sections

// Projects with category "other" (halatia, the-outfiters) have their own custom pages
// under app/work/<slug>/ (static segments win over [slug]). The generic template must
// never render them.
export function generateStaticParams() {
  return projects.filter((p) => p.category !== "other").map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = projects.find((x) => x.slug === params.slug);
  if (!p || p.category === "other") {
    return { title: "Page not found", robots: { index: false, follow: true } };
  }
  const { title, description } = getProjectSeo(p);
  const poster = posterFor(getPreviewVideos(p)[0]);
  const meta = pageMeta({
    title,
    description,
    path: `/work/${p.slug}`,
    ogType: "video.other",
    image: poster,
    imageWidth: poster ? POSTER_WIDTH : undefined,
    imageHeight: poster ? POSTER_HEIGHT : undefined,
    imageAlt: `${p.title}, a film by Remi Karlin`,
  });
  // hidden projects stay reachable by URL but are kept out of search results
  return p.hidden ? { ...meta, robots: { index: false, follow: true } } : meta;
}

export default function ProjectPage({ params }: { params: { slug: string } }) {
  const idx = projects.findIndex((p) => p.slug === params.slug);
  if (idx === -1 || projects[idx].category === "other") notFound();
  const project = projects[idx];
  // prev/next only link to listed pages: hidden projects are skipped
  const visible = projects.filter((p) => !p.hidden || p.slug === project.slug);
  const vIdx = visible.findIndex((p) => p.slug === project.slug);
  const prev = vIdx > 0 ? visible[vIdx - 1] : null;
  const next = vIdx < visible.length - 1 ? visible[vIdx + 1] : null;

  const { description: seoDescription } = getProjectSeo(project);
  const pageUrl = `${SITE_URL}/work/${project.slug}`;
  const section = projectSection(project);
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: section.name, item: `${SITE_URL}${section.path}` },
      { "@type": "ListItem", position: 3, name: project.title, item: pageUrl },
    ],
  };
  const videoLd = project.videos
    .filter((v) => v.youtubeId && v.youtubeId !== "YOUR_YOUTUBE_ID")
    .map((v) => ({
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: v.title === project.title ? v.title : `${v.title} — ${project.title}`,
      description: v.description ?? seoDescription,
      thumbnailUrl: [`https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`],
      embedUrl: `https://www.youtube-nocookie.com/embed/${v.youtubeId}`,
      contentUrl: `https://www.youtube.com/watch?v=${v.youtubeId}`,
      creator: { "@id": PERSON_ID },
      mainEntityOfPage: pageUrl,
      inLanguage: "en",
    }));

  return (
    <main className="page project-page">
      {jsonLdScript(breadcrumbLd, "breadcrumb")}
      {videoLd.map((d, i) => jsonLdScript(d, `video-${i}`))}
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
                priority={i === 0}
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
                return `/images/modessec/NDLE_2024_RK_-${n}.webp`;
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
                "/images/fan-yan/P1129581.webp",
                "/images/fan-yan/P1129582.webp",
                "/images/fan-yan/P1129583.webp",
                "/images/fan-yan/P1129585.webp",
                "/images/fan-yan/P1129586.webp",
                "/images/fan-yan/P1129587.webp",
                "/images/fan-yan/P1129592.webp",
                "/images/fan-yan/P1129595.webp",
                "/images/fan-yan/P1129599.webp",
                "/images/fan-yan/P1129600.webp",
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
