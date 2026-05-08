import Link from "next/link";
import BackButton from "@/components/BackButton";
import PhotoCarousel from "@/components/PhotoCarousel";
import Footer from "@/components/Footer";
import processImages from "@/data/ruinarktefact-process-images.json";

export const metadata = {
  title: "Ruinarktefact Process — Remi Karlin",
  description: "The creative and communications process behind VOLCAN'ARCHIK — mascot design, campaign identity, and the declaration short film.",
};

const campaignAssets = [
  "/images/ruinarktefact/mascot.png",
  "/images/ruinarktefact/campaign-3d-no-bg.png",
  "/images/ruinarktefact/campaign-3d.webp",
  "/images/ruinarktefact/campaign-vrk-no-bg.png",
  "/images/ruinarktefact/campaign-vrk.jpg",
  "/images/ruinarktefact/instagram-grid.png",
];

export default function RuinarktefactProcessPage() {
  return (
    <main className="page project-page" style={{ background: "var(--bg)" }}>
      <BackButton />

      <header style={{ maxWidth: 1200, margin: "0 auto", padding: "140px var(--pad-x) 64px" }}>
        <div className="project-eyebrow" style={{ color: "rgba(255,255,255,0.45)", marginBottom: 18 }}>
          Creative Process
        </div>
        <h1 style={{ fontWeight: 800, fontSize: "clamp(48px, 8vw, 96px)", letterSpacing: "-0.03em", lineHeight: 0.88, color: "#fff", margin: "0 0 20px" }}>
          Ruinarktefact Process
        </h1>
        <div style={{ fontWeight: 300, fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 32 }}>
          Campaign identity · Art direction · Short film
        </div>
        <p style={{ fontWeight: 300, fontSize: 15, lineHeight: 1.8, color: "var(--text-2)", maxWidth: 680, margin: "0 0 24px" }}>
          The creative and communications process behind VOLCAN'ARCHIK — the BDE ESSEC 2024/25 campaign association, where Remi served as Head of Communications. The design work began with mascot concepting in Procreate, refined through Photoshop and Illustrator for vectorisation, then extended into 3D name designs built in Blender, Photoshop, and Adobe Firefly with Midjourney-generated backgrounds. The centrepiece was a 20-minute declaration short film — scripted, moodboarded shot-by-shot, filmed on a Sony FX3 with a 24-70 GM lens, graded in DaVinci Resolve with phantom LUTs, and finished in Premiere Pro and After Effects for 3D special effects. The campaign reached over 40,000 views across platforms.
        </p>
        <div style={{ display: "flex", gap: "16px 40px", flexWrap: "wrap", fontWeight: 200, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
          <span>2024 – 2025</span>
          <span>Paris</span>
          <span>Art Direction · Film · Campaign Identity</span>
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
              alt={`Ruinarktefact process ${i + 1}`}
              style={{ width: "100%", display: "block" }}
            />
          ))}
        </div>
      </section>

      {/* Campaign assets */}
      <section style={{ maxWidth: 1200, margin: "48px auto 0", borderTop: "1px solid var(--line)", padding: "48px var(--pad-x) 0" }}>
        <div className="project-section-label" style={{ marginBottom: 32 }}>Campaign assets</div>
        <PhotoCarousel
          images={campaignAssets}
          alt="Campaign asset"
          height="clamp(260px, 42vh, 520px)"
          slideWidth={72}
          sideOffset={78}
          sideScale={0.75}
          centerFit="contain"
        />
        <div style={{ marginTop: 14, fontWeight: 300, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-dim)", paddingBottom: 96 }}>
          Mascot · Campaign name designs · Instagram grid — Procreate, Illustrator, Photoshop, Blender, Firefly, Midjourney
        </div>
      </section>

      <nav className="project-prev-next" aria-label="Project navigation">
        <div>
          <Link href="/work/b1nbags-process">
            <div className="pn-label">← Previous</div>
            <div className="pn-title">B1NBAGS Process</div>
          </Link>
        </div>
        <div className="pn-right" />
      </nav>

      <Footer />
    </main>
  );
}
