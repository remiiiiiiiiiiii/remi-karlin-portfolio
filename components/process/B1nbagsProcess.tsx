import ScrollReveal from "@/components/ScrollReveal";
import processImages from "@/data/b1nbags-process-images.json";

const brandImages = [
  "/images/b1nbags/banner.webp",
  "/images/b1nbags/instagram-grid.webp",
];

/** B1NBAGS creative process: slides + brand assets, rendered at the bottom of /work/b1nbags. */
export default function B1nbagsProcess() {
  return (
    <section id="process" className="project-section">
      <ScrollReveal>
        <div className="project-section-label">Creative process</div>
        <div style={{ fontWeight: 300, fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 32 }}>
          Brand identity · Screen-printing · Photography · Film
        </div>
        <p style={{ fontWeight: 300, fontSize: 15, lineHeight: 1.8, color: "var(--text-2)", maxWidth: 680, margin: "0 0 24px" }}>
          The creative and production process behind B1NBAGS — a Hong Kong clothing brand started in 2023 with patterns drawn from scans of old Hong Kong dollar bills. Physically, designs are brought into Photoshop as bitmap exports, converted to .tif files, and sent to professional screen-printing studios where water-based paint is applied by hand to jeans, t-shirts, hoodies, and jackets. On the visual side, photography is shot on a Lumix S5II with film-emulating colour profiles in Lightroom C. Video colour grading was developed over two years of research in DaVinci Resolve, mixing film emulation plug-ins to build a consistent vintage, textured look. In 2025 the brand restarted with a sharper focus on communicating the creative lifestyle over the product itself.
        </p>
        <div style={{ display: "flex", gap: "16px 40px", flexWrap: "wrap", fontWeight: 200, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 48 }}>
          <span>2023 – 2025</span>
          <span>Hong Kong</span>
          <span>Brand Identity · Art Direction · Photography</span>
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {processImages.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={`B1NBAGS process ${i + 1}`}
              loading="lazy"
              style={{ width: "100%", display: "block", borderRadius: 0 }}
            />
          ))}
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <div className="project-section-label" style={{ marginTop: 64, marginBottom: 32 }}>Brand assets</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {brandImages.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={`B1NBAGS brand ${i + 1}`}
              loading="lazy"
              style={{ width: "100%", display: "block" }}
            />
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
