import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  projects,
  getPreviewVideos,
  getAgencyProjects,
  agencyLine,
  type Project,
  type ProjectVideoEntry,
} from "@/lib/projects";
import havasCopy from "@/data/havas-copy.json";
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
import ImageGallery from "@/components/ImageGallery";
import AgencyCard from "@/components/AgencyCard";
import PhotoCarousel from "@/components/PhotoCarousel"; // used by modessec + fan-yan sections
import { posterPath } from "@/lib/posters";
import B1nbagsProcess from "@/components/process/B1nbagsProcess";
import RuinarktefactProcess from "@/components/process/RuinarktefactProcess";

const VERTICAL = new Set(["9:16", "4:5"]);
const COMPACT = new Set(["9:16", "4:5", "1:1"]);
const ASPECT_LABEL: Record<string, string> = {
  "9:16": "Vertical 9:16",
  "4:5": "Portrait 4:5",
  "1:1": "Square 1:1",
  "16:9": "Landscape 16:9",
  "3:2": "Landscape 3:2",
};

/** Same order the hub page uses (data/havas-copy.json `order`). */
const HAVAS_ORDER: Record<string, number> = Object.fromEntries(
  Object.entries(havasCopy.clients).map(([slug, c]) => [slug, (c as { order: number }).order])
);

function hasYouTube(v: ProjectVideoEntry): boolean {
  return !!v.youtubeId && v.youtubeId !== "YOUR_YOUTUBE_ID";
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function isoDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `PT${m ? `${m}M` : ""}${s || !m ? `${s}S` : ""}`;
}

/** Technical line under a film: format, length, other cuts. Empty for projects that carry none of it. */
function videoMeta(v: ProjectVideoEntry): string {
  const parts: string[] = [];
  if (v.aspect && ASPECT_LABEL[v.aspect]) parts.push(ASPECT_LABEL[v.aspect]);
  if (v.durationSec) parts.push(formatDuration(v.durationSec));
  if (v.variants && v.variants.length > 0) parts.push(`Also cut as ${v.variants.join(" · ")}`);
  return parts.join(" · ");
}

/**
 * Consecutive vertical / square films are grouped into one grid so a long run does not become a
 * stack of tall players. Everything else stays one film per row, in order.
 */
function groupVideos(videos: ProjectVideoEntry[]): { rail: boolean; items: { v: ProjectVideoEntry; i: number }[] }[] {
  const groups: { rail: boolean; items: { v: ProjectVideoEntry; i: number }[] }[] = [];
  videos.forEach((v, i) => {
    const compact = !hasYouTube(v) && COMPACT.has(v.aspect ?? "");
    const last = groups[groups.length - 1];
    if (compact && last?.rail) last.items.push({ v, i });
    else groups.push({ rail: compact, items: [{ v, i }] });
  });
  // a lone vertical film is not a rail
  return groups.map((g) => (g.rail && g.items.length < 2 ? { ...g, rail: false } : g));
}

function heroIsPortrait(project: Project): boolean {
  const first = getPreviewVideos(project)[0];
  const v = project.videos.find((x) => x.previewVideo === first);
  return !!v?.aspect && VERTICAL.has(v.aspect);
}

// Projects with category "other" (halatia, the-outfiters) and projects flagged `custom` (the
// Travel hub) have their own pages under app/work/<slug>/ (static segments win over [slug]).
// The generic template must never render them.
const hasOwnPage = (p: Project) => p.category === "other" || !!p.custom;

export function generateStaticParams() {
  return projects.filter((p) => !hasOwnPage(p)).map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = projects.find((x) => x.slug === params.slug);
  if (!p || hasOwnPage(p)) {
    return { title: "Page not found", robots: { index: false, follow: true } };
  }
  const { title, description } = getProjectSeo(p);
  const poster = posterFor(getPreviewVideos(p)[0]);
  // declare 1280x720 only when the poster is known to be that size: the first film is 16:9, or
  // (older projects without aspect info) not agency work. Anything else omits the dimensions.
  const firstAspect = p.videos[0]?.aspect;
  const landscapePoster = firstAspect ? firstAspect === "16:9" : !p.agency;
  const image = poster ?? p.thumbnail;
  const meta = pageMeta({
    title,
    description,
    path: `/work/${p.slug}`,
    ogType: "video.other",
    image,
    imageWidth: poster && landscapePoster ? POSTER_WIDTH : undefined,
    imageHeight: poster && landscapePoster ? POSTER_HEIGHT : undefined,
    imageAlt: p.agency
      ? `${p.title}, work for ${p.agency.name} by Remi Karlin`
      : `${p.title}, a film by Remi Karlin`,
  });
  // hidden projects stay reachable by URL but are kept out of search results
  return p.hidden ? { ...meta, robots: { index: false, follow: true } } : meta;
}

export default function ProjectPage({ params }: { params: { slug: string } }) {
  const idx = projects.findIndex((p) => p.slug === params.slug);
  if (idx === -1 || hasOwnPage(projects[idx])) notFound();
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
  const ytLd = project.videos.filter(hasYouTube).map((v) => ({
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
  // self-hosted films: the mp4 itself is the contentUrl
  const selfLd = project.videos
    .filter((v) => !hasYouTube(v) && !!v.localVideo)
    .map((v) => {
      const thumb = v.previewVideo ? posterPath(v.previewVideo) : project.thumbnail;
      return {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: v.title === project.title ? v.title : `${v.title} — ${project.title}`,
        description: v.description ?? seoDescription,
        ...(thumb ? { thumbnailUrl: [`${SITE_URL}${thumb}`] } : {}),
        contentUrl: `${SITE_URL}${v.localVideo}`,
        ...(v.durationSec ? { duration: isoDuration(v.durationSec) } : {}),
        creator: { "@id": PERSON_ID },
        mainEntityOfPage: pageUrl,
        inLanguage: "en",
      };
    });
  const videoLd = [...ytLd, ...selfLd];

  const agency = project.agency;
  const moreFromAgency = agency ? getAgencyProjects(agency.slug, HAVAS_ORDER, project.slug) : [];
  const groups = groupVideos(project.videos);
  const portraitHero = heroIsPortrait(project);

  return (
    <main className="page project-page">
      {jsonLdScript(breadcrumbLd, "breadcrumb")}
      {videoLd.map((d, i) => jsonLdScript(d, `video-${i}`))}
      <BackButton />
      {/* Full-viewport hero with title/info overlaid at bottom-left */}
      <div className={portraitHero ? "project-hero project-hero--portrait" : "project-hero"}>
        <div className="project-video-frame">
          <CyclingVideo srcs={getPreviewVideos(project)} />
        </div>

        <div className="project-hero-overlay">
          <div className="project-hero-inner">
            <div className="project-hero-eyebrow">{agency ? `${agency.name} · ${project.tag}` : project.tag}</div>
            <h1 className="project-hero-title">{project.title}</h1>
            {(project.subtitle || project.client) && (
              <div className="project-hero-tagline">{project.subtitle || project.client}</div>
            )}
            <div className="project-hero-meta">
              <span>{project.year}</span>
              <span>{project.location}</span>
              {project.roles.length > 0 && (
                <span>{project.roles.join(" · ")}</span>
              )}
            </div>
            <p className="project-hero-desc">{project.description}</p>
            {project.links?.map((l) => (
              <a
                key={l.url}
                className="project-link"
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Credits */}
      <section className="project-body">
        <ScrollReveal className="project-credits">
          <dl>
            {agency && (
              <ProjectCreditRow
                label="Agency"
                value={<Link href={`/work/${agency.slug}`}>{agencyLine(agency)}</Link>}
              />
            )}
            {project.client && !("Client" in project.credits) && (
              <ProjectCreditRow label="Client" value={project.client} />
            )}
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
          {groups.map((g, gi) => {
            const films = g.items.map(({ v, i }) => {
              const meta = videoMeta(v);
              return (
                <ScrollReveal key={`${v.title}-${i}`} delay={g.rail ? (i % 3) * 100 : i * 100} className="project-additional-video">
                  <h3 className="project-additional-video-title">{v.title}</h3>
                  <ProjectVideo
                    youtubeId={v.youtubeId}
                    localVideo={v.localVideo}
                    previewVideo={v.previewVideo}
                    title={v.title}
                    aspect={v.aspect}
                    pending={v.pending}
                    priority={i === 0}
                  />
                  {meta && <div className="pv-meta">{meta}</div>}
                  {v.description && (
                    <div className="project-additional-video-caption">{v.description}</div>
                  )}
                </ScrollReveal>
              );
            });
            return g.rail ? (
              <div key={`rail-${gi}`} className="pv-rail" style={gi > 0 ? { marginTop: 48 } : undefined}>
                {films}
              </div>
            ) : (
              films
            );
          })}
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

      {/* Creative process — folded in from the old standalone process pages */}
      {project.slug === "b1nbags" && <B1nbagsProcess />}
      {project.slug === "ruinarktefact" && <RuinarktefactProcess />}

      {/* Image galleries (agency work: posters, stickers, portraits) */}
      {(project.galleries ?? [])
        .filter((g) => g.images.length > 0)
        .map((g, gi) => (
          <section key={`${g.title}-${gi}`} className="project-section">
            <ScrollReveal>
              <div className="project-section-label">{g.title}</div>
              <ImageGallery images={g.images} alt={`${project.title}, ${g.title}`} />
            </ScrollReveal>
          </section>
        ))}

      {/* More from the same agency */}
      {agency && moreFromAgency.length > 0 && (
        <section className="project-section" aria-label={`More from ${agency.name}`}>
          <div className="agency-more-head">
            <div className="project-section-label">More from {agency.name}</div>
            <Link className="project-link" style={{ marginTop: 0 }} href={`/work/${agency.slug}`}>
              All {agency.name} work
            </Link>
          </div>
          <div className="havas-grid havas-grid--small">
            {moreFromAgency.map((p) => (
              <AgencyCard key={p.slug} p={p} />
            ))}
          </div>
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

function ProjectCreditRow({ label, value }: { label: string; value: React.ReactNode }) {
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
