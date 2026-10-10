import Link from "next/link";
import { getHubEntries, projects } from "@/lib/projects";
import { pageMeta } from "@/lib/seo";
import BackButton from "@/components/BackButton";
import AgencyCard from "@/components/AgencyCard";
import Footer from "@/components/Footer";

const SLUG = "brand-identity";
const INTRO =
  "Identity work for four projects: Halatia, an eau de parfum, and The Outfiters, a Vietnamese streetwear project, both started with friends and never launched; B1NBAGS, a clothing label in Hong Kong; and the Volcan'Archik student campaign, made with teammates. Logo, palette, type and the first visuals for each.";

export const metadata = pageMeta({
  title: "Brand Identity — Halatia, The Outfiters, B1NBAGS, Volcan'Archik | Remi Karlin",
  description:
    "Brand identity and art direction case studies by Remi Karlin: Halatia Paris eau de parfum, The Outfiters, the B1NBAGS clothing brand and the Volcan'Archik campaign.",
  path: `/work/${SLUG}`,
});

export default function BrandIdentityHub() {
  // Every project reached through this hub, in projects.json order.
  const brands = getHubEntries(SLUG);
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
          Case studies
        </div>
        <h1 className="page-title">Brand Identity</h1>
        <div className="page-subtitle" style={{ textTransform: "uppercase", fontSize: 14, letterSpacing: "0.08em" }}>
          Four identities · Paris · Hong Kong · 2023–25
        </div>
      </header>

      <div className="havas-intro">
        <p>{INTRO}</p>
        <div className="havas-intro-meta">
          <span>2023–25</span>
          <span>Paris</span>
          <span>Art Director · Brand Designer</span>
        </div>
      </div>

      <section className="havas-clients" aria-label="Brands">
        <div className="project-section-label">Brands</div>
        {brands.length > 0 ? (
          <div className="havas-grid">
            {brands.map((e) => (
              <AgencyCard key={e.href} p={e.project} title={e.title} href={e.href} detail />
            ))}
          </div>
        ) : (
          <p className="havas-empty">The brand work is being added. Check back soon.</p>
        )}
      </section>

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
