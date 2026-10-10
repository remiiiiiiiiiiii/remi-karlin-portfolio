import ScrollReveal from "@/components/ScrollReveal";
import PhotoCarousel from "@/components/PhotoCarousel";
import processImages from "@/data/ruinarktefact-process-images.json";

const campaignAssets = [
  "/images/ruinarktefact/mascot.webp",
  "/images/ruinarktefact/campaign-3d-no-bg.webp",
  "/images/ruinarktefact/campaign-3d.webp",
  "/images/ruinarktefact/campaign-vrk-no-bg.webp",
  "/images/ruinarktefact/campaign-vrk.webp",
  "/images/ruinarktefact/instagram-grid.webp",
];

/** Ruinarktefact creative process: slides + campaign assets, rendered at the bottom of /work/ruinarktefact. */
export default function RuinarktefactProcess() {
  return (
    <section id="process" className="project-section">
      <ScrollReveal>
        <div className="project-section-label">Creative process</div>
        <div style={{ fontWeight: 300, fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 32 }}>
          Film · Creative production · Campaign identity
        </div>
        <p style={{ fontWeight: 300, fontSize: 15, lineHeight: 1.8, color: "var(--text-2)", maxWidth: 680, margin: "0 0 24px" }}>
          The creative process behind VOLCAN'ARCHIK, the BDE ESSEC 2024/25 campaign. The design work began with mascot concepting in Procreate, refined through Photoshop and Illustrator for vectorisation, then extended into 3D name designs built in Blender, Photoshop, and Adobe Firefly with Midjourney-generated backgrounds. The centrepiece was a 20-minute declaration short film — scripted, moodboarded shot-by-shot, filmed on a Sony FX3 with a 24-70 GM lens, graded in DaVinci Resolve with phantom LUTs, and finished in Premiere Pro and After Effects for 3D special effects. Teammates helped with sound design, mascot design, derushing and planning.
        </p>
        <div style={{ display: "flex", gap: "16px 40px", flexWrap: "wrap", fontWeight: 200, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 48 }}>
          <span>2024 – 2025</span>
          <span>Paris</span>
          <span>Film · Creative Production · Campaign Identity</span>
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {processImages.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={`Ruinarktefact process ${i + 1}`}
              loading="lazy"
              style={{ width: "100%", display: "block" }}
            />
          ))}
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <div className="project-section-label" style={{ marginTop: 64, marginBottom: 32 }}>Campaign assets</div>
        <PhotoCarousel
          images={campaignAssets}
          alt="Campaign asset"
          height="clamp(260px, 42vh, 520px)"
          slideWidth={72}
          sideOffset={78}
          sideScale={0.75}
          centerFit="contain"
        />
        <div style={{ marginTop: 14, fontWeight: 300, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-dim)" }}>
          Mascot · Campaign name designs · Instagram grid — Procreate, Illustrator, Photoshop, Blender, Firefly, Midjourney
        </div>
      </ScrollReveal>
    </section>
  );
}
