import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, projects } from "@/lib/projects";
import { SITE_URL, PERSON_ID, WEBSITE_ID, jsonLdScript, pageMeta } from "@/lib/seo";
import BackButton from "@/components/BackButton";
import Footer from "@/components/Footer";
import ProjectVideo from "@/components/ProjectVideo";
import ScrollReveal from "@/components/ScrollReveal";

const SLUG = "travel";
const hub = getProject(SLUG);

export const metadata = pageMeta({
  title: "Travel Films — Hong Kong to New York | Remi Karlin",
  description:
    hub?.description ??
    "Personal travel films shot between Hong Kong and New York, filmed on a Lumix S5II and graded in DaVinci Resolve.",
  path: `/work/${SLUG}`,
});

export default function TravelHub() {
  if (!hub) notFound();

  // One section per destination, in projects.json order (hub itself and hidden ones excluded).
  const destinations = projects.filter(
    (p) => p.category === "travel" && !p.custom && !p.hidden && p.videos.length > 0
  );

  // prev/next only link to listed pages: hidden projects are skipped
  const visible = projects.filter((p) => !p.hidden || p.slug === SLUG);
  const idx = visible.findIndex((p) => p.slug === SLUG);
  const prev = idx > 0 ? visible[idx - 1] : null;
  const next = idx >= 0 && idx < visible.length - 1 ? visible[idx + 1] : null;

  const pageUrl = `${SITE_URL}/work/${SLUG}`;
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#page`,
    url: pageUrl,
    name: "Travel Films — Hong Kong to New York",
    description: hub.description,
    inLanguage: "en",
    isPartOf: { "@id": WEBSITE_ID },
    author: { "@id": PERSON_ID },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: destinations.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: p.title,
        url: `${SITE_URL}/work/${p.slug}`,
      })),
    },
  };

  const meta = [hub.year, hub.roles.join(" · "), hub.credits.Camera].filter(Boolean);

  return (
    <main className="page project-page" style={{ background: "var(--bg)" }}>
      {jsonLdScript(collectionLd, "collection")}
      <BackButton />

      <header className="page-header" style={{ paddingTop: 140, paddingBottom: 40 }}>
        <div className="page-eyebrow" style={{ color: "rgba(255,255,255,0.45)" }}>
          Travel
        </div>
        <h1 className="page-title">{hub.title}</h1>
        <div className="page-subtitle" style={{ textTransform: "uppercase", fontSize: 14, letterSpacing: "0.08em" }}>
          {hub.subtitle}
        </div>
      </header>

      <div className="havas-intro">
        <p>{hub.description}</p>
        <div className="havas-intro-meta">
          {meta.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </div>

      {destinations.map((p, pi) => {
        const wideFirst = p.videos.length >= 3;
        return (
          <section key={p.slug} className="project-section travel-section" aria-labelledby={`travel-${p.slug}`}>
            <div className="travel-head">
              <h2 className="travel-title" id={`travel-${p.slug}`}>
                <Link href={`/work/${p.slug}`}>{p.title}</Link>
              </h2>
              <div className="travel-sub">{p.subtitle}</div>
            </div>
            <div className="travel-grid">
              {p.videos.map((v, vi) => (
                <ScrollReveal
                  key={`${v.title}-${vi}`}
                  delay={(vi % 2) * 100}
                  className={wideFirst && vi === 0 ? "project-additional-video travel-film travel-film--wide" : "project-additional-video travel-film"}
                >
                  <h3 className="project-additional-video-title">{v.title}</h3>
                  <ProjectVideo
                    youtubeId={v.youtubeId}
                    localVideo={v.localVideo}
                    previewVideo={v.previewVideo}
                    title={v.title}
                    aspect={v.aspect}
                    pending={v.pending}
                    priority={pi === 0 && vi === 0}
                  />
                </ScrollReveal>
              ))}
            </div>
          </section>
        );
      })}

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
