import Link from "next/link";
import { getAgencyProjects, HAVAS_ALSO, HAVAS_ORDER, projects } from "@/lib/projects";
import { pageMeta } from "@/lib/seo";
import BackButton from "@/components/BackButton";
import AgencyCard from "@/components/AgencyCard";
import Footer from "@/components/Footer";
import copy from "@/data/havas-copy.json";

const SLUG = copy.hub.slug;

export const metadata = pageMeta({
  title: "Havas Play — Editor & Art Director, Paris | Remi Karlin",
  description:
    "Internship at Havas Play, the sports and entertainment agency of Havas in Paris, January to June 2026: editing, art direction and some filming for sports and entertainment brands.",
  path: `/work/${SLUG}`,
});

export default function HavasPlayHub() {
  // Every project made for Havas Play, in the order set in data/havas-copy.json, in two tiers:
  // the main clients (full cards), then the smaller "Also at Havas" section.
  const all = getAgencyProjects(SLUG, HAVAS_ORDER);
  const clients = all.filter((p) => !HAVAS_ALSO.has(p.slug));
  const also = all.filter((p) => HAVAS_ALSO.has(p.slug));
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
          {copy.hub.tag}
        </div>
        <h1 className="page-title">{copy.hub.title}</h1>
        <div className="page-subtitle" style={{ textTransform: "uppercase", fontSize: 14, letterSpacing: "0.08em" }}>
          {copy.hub.subtitle}
        </div>
      </header>

      <div className="havas-intro">
        <p>{copy.hub.intro}</p>
        <div className="havas-intro-meta">
          <span>2026</span>
          <span>Paris</span>
          <span>{copy.hub.roles.join(" · ")}</span>
        </div>
      </div>

      <section className="havas-clients" aria-label="Clients">
        <div className="project-section-label">{copy.hub.mainLabel}</div>
        {clients.length > 0 ? (
          <div className="havas-grid">
            {clients.map((p) => (
              <AgencyCard key={p.slug} p={p} detail />
            ))}
          </div>
        ) : (
          <p className="havas-empty">The client work is being added. Check back soon.</p>
        )}
      </section>

      {also.length > 0 && (
        <section className="havas-clients havas-also" aria-label={copy.hub.alsoLabel}>
          <div className="project-section-label">{copy.hub.alsoLabel}</div>
          <div className="havas-grid havas-grid--small">
            {also.map((p) => (
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
