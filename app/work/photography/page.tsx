import Link from "next/link";
import { getProject, projects } from "@/lib/projects";
import { pageMeta } from "@/lib/seo";
import BackButton from "@/components/BackButton";
import Footer from "@/components/Footer";
import ImageGallery from "@/components/ImageGallery";
import StillSlideshow from "@/components/StillSlideshow";
import galleryData from "@/data/photography-images.json";

type Section = { id: string; title: string; groups: { title?: string; images: { path: string; width: number; height: number }[] }[] };
// data/photography-images.json: sections in page order, each with one or more titled groups (film stocks), photos in display order.
const gallery = galleryData as { sections: Section[] };

const SLUG = "photography";
const LINE = "35mm film, events, portraits and personal work, shot by Remi.";

export const metadata = pageMeta({
  title: "Photography | Remi Karlin",
  description: LINE,
  path: `/work/${SLUG}`,
  image: "/images/thumbs/photography-16x9.webp",
  imageWidth: 1280,
  imageHeight: 720,
  imageAlt: "Photography by Remi Karlin",
});

export default function PhotographyPage() {
  // The preview slideshow is the homepage hero row: same stills, same order (heroClips in data/projects.json).
  const stills = getProject(SLUG)?.heroClips ?? [];
  // prev/next only link to listed pages: hidden projects are skipped
  const visible = projects.filter((p) => !p.hidden || p.slug === SLUG);
  const idx = visible.findIndex((p) => p.slug === SLUG);
  const prev = idx > 0 ? visible[idx - 1] : null;
  const next = idx >= 0 && idx < visible.length - 1 ? visible[idx + 1] : null;

  return (
    <main className="page project-page" style={{ background: "var(--bg)" }}>
      <BackButton />

      <header className="page-header" style={{ paddingTop: 140, paddingBottom: 40 }}>
        <div className="page-eyebrow" style={{ color: "rgba(255,255,255,0.45)" }}>
          Photography
        </div>
        <h1 className="page-title">Photography</h1>
        <p className="page-subtitle">{LINE}</p>
        <nav className="photo-jump" aria-label="Sections">
          {gallery.sections.map((s) => (
            <a key={s.id} href={`#${s.id}`}>
              {s.title}
            </a>
          ))}
        </nav>
      </header>

      {stills.length > 0 && (
        <div className="photo-top">
          <StillSlideshow images={stills} intervalMs={2000} />
        </div>
      )}

      {gallery.sections.map((s) => (
        <section key={s.id} id={s.id} className="photo-section" aria-labelledby={`${s.id}-h`}>
          <h2 id={`${s.id}-h`} className="project-section-label">
            {s.title}
          </h2>
          {s.groups.map((g, gi) => (
            <div key={g.title ?? gi} className="photo-group">
              {g.title && <h3 className="photo-stock-label">{g.title}</h3>}
              <ImageGallery layout="rows" images={g.images} alt={g.title ? `${g.title}, ${s.title.toLowerCase()}` : `${s.title} photograph`} />
            </div>
          ))}
        </section>
      ))}

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
