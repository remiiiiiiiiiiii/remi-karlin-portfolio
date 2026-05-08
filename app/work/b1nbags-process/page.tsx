import Link from "next/link";
import BackButton from "@/components/BackButton";
import Footer from "@/components/Footer";
import processImages from "@/data/b1nbags-process-images.json";

export const metadata = {
  title: "B1NBAGS Process — Remi Karlin",
  description: "The creative and production process behind B1NBAGS — brand identity, screen-printing, photography, and video.",
};

const brandImages = [
  "/images/b1nbags/banner.png",
  "/images/b1nbags/instagram-grid.png",
];

export default function B1nbagsProcessPage() {
  return (
    <main className="page project-page" style={{ background: "var(--bg)" }}>
      <BackButton />

      <header style={{ maxWidth: 1200, margin: "0 auto", padding: "140px var(--pad-x) 64px" }}>
        <div className="project-eyebrow" style={{ color: "rgba(255,255,255,0.45)", marginBottom: 18 }}>
          Creative Process
        </div>
        <h1 style={{ fontWeight: 800, fontSize: "clamp(48px, 8vw, 96px)", letterSpacing: "-0.03em", lineHeight: 0.88, color: "#fff", margin: "0 0 20px" }}>
          B1NBAGS Process
        </h1>
        <div style={{ fontWeight: 300, fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 32 }}>
          Brand identity · Screen-printing · Photography · Film
        </div>
        <p style={{ fontWeight: 300, fontSize: 15, lineHeight: 1.8, color: "var(--text-2)", maxWidth: 680, margin: "0 0 24px" }}>
          The creative and production process behind B1NBAGS — a Hong Kong clothing brand started in 2023 with patterns drawn from scans of old Hong Kong dollar bills. Physically, designs are brought into Photoshop as bitmap exports, converted to .tif files, and sent to professional screen-printing studios where water-based paint is applied by hand to jeans, t-shirts, hoodies, and jackets. On the visual side, photography is shot on a Lumix S5II with film-emulating colour profiles in Lightroom C. Video colour grading was developed over two years of research in DaVinci Resolve, mixing film emulation plug-ins to build a consistent vintage, textured look. In 2025 the brand restarted with a sharper focus on communicating the creative lifestyle over the product itself.
        </p>
        <div style={{ display: "flex", gap: "16px 40px", flexWrap: "wrap", fontWeight: 200, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
          <span>2023 – 2025</span>
          <span>Hong Kong</span>
          <span>Brand Identity · Art Direction · Photography</span>
        </div>
      </header>

      {/* 3 large process slides */}
      <section style={{ maxWidth: 1200, margin: "0 auto", borderTop: "1px solid var(--line)", padding: "48px var(--pad-x) 0" }}>
        <div className="project-section-label" style={{ marginBottom: 32 }}>Process</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {processImages.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={`B1NBAGS process ${i + 1}`}
              style={{ width: "100%", display: "block", borderRadius: 0 }}
            />
          ))}
        </div>
      </section>

      {/* Brand assets */}
      <section style={{ maxWidth: 1200, margin: "48px auto 0", borderTop: "1px solid var(--line)", padding: "48px var(--pad-x) 96px" }}>
        <div className="project-section-label" style={{ marginBottom: 32 }}>Brand assets</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {brandImages.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={`B1NBAGS brand ${i + 1}`}
              style={{ width: "100%", display: "block" }}
            />
          ))}
        </div>
      </section>

      <nav className="project-prev-next" aria-label="Project navigation">
        <div />
        <div className="pn-right">
          <Link href="/work/ruinarktefact-process">
            <div className="pn-label">Next →</div>
            <div className="pn-title">Ruinarktefact Process</div>
          </Link>
        </div>
      </nav>

      <Footer />
    </main>
  );
}
