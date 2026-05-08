import Link from "next/link";
import { projects } from "@/lib/projects";
import BackButton from "@/components/BackButton";
import PhotoGallery from "@/components/PhotoGallery";
import Footer from "@/components/Footer";
import images from "@/data/unfold-agency-images.json";

export const metadata = {
  title: "Unfold Agency — Remi Karlin",
  description: "Brand identity for Unfold Agency — a creative agency built around the metaphor of origami.",
};

export default function UnfoldAgencyPage() {
  const idx = projects.findIndex((p) => p.slug === "unfold-agency");
  const prev = idx > 0 ? projects[idx - 1] : null;
  const next = idx < projects.length - 1 ? projects[idx + 1] : null;

  return (
    <main className="page project-page" style={{ background: "var(--bg)" }}>
      <BackButton />

      <header style={{ maxWidth: 1200, margin: "0 auto", padding: "140px var(--pad-x) 64px" }}>
        <div className="project-eyebrow" style={{ color: "rgba(255,255,255,0.45)", marginBottom: 18 }}>
          Brand Identity
        </div>
        <h1 style={{ fontWeight: 800, fontSize: "clamp(48px, 8vw, 96px)", letterSpacing: "-0.03em", lineHeight: 0.88, color: "#fff", margin: "0 0 20px" }}>
          Unfold Agency
        </h1>
        <div style={{ fontWeight: 300, fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 32 }}>
          Brand identity · Creative agency
        </div>
        <p style={{ fontWeight: 300, fontSize: 15, lineHeight: 1.8, color: "var(--text-2)", maxWidth: 680, margin: "0 0 24px" }}>
          Brand identity for Unfold Agency — a creative agency built around the metaphor of origami. The name captures the agency's philosophy: starting with raw, unstructured ideas and transforming them through intentional process into something structured, expressive, and elevated. The origami crane serves as the logo mark, symbolising possibility, momentum, and the idea that well-crafted work is designed not just to exist, but to take flight. The identity pairs sky blue and navy blue — openness and authority — with League Spartan and Playfair Display for a balance of modern confidence and editorial refinement.
        </p>
        <div style={{ display: "flex", gap: "16px 40px", flexWrap: "wrap", fontWeight: 200, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
          <span>2025</span>
          <span>Brand Identity · Art Direction</span>
        </div>
      </header>

      {images.length > 0 && (
        <section style={{ maxWidth: 1200, margin: "0 auto", borderTop: "1px solid var(--line)", padding: "48px var(--pad-x) 96px" }}>
          <div className="project-section-label" style={{ marginBottom: 24 }}>Brand board</div>
          <PhotoGallery images={images} alt="Unfold Agency brand board" columns={2} />
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
