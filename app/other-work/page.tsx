import Link from "next/link";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Other Work — Remi Karlin",
  description: "Photography and other creative work by Remi Karlin.",
};

export default function OtherWorkPage() {
  return (
    <main className="page other-work-page">
      <header className="page-header">
        <div className="page-eyebrow">Other Work</div>
        <h1 className="page-title">Photography &amp; More</h1>
      </header>

      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 var(--pad-x) 96px" }}>

        {[
          {
            href: "/work/halatia",
            category: "Brand Identity",
            title: "Halatia",
            subtitle: "Brand identity · Eau de parfum · Paris",
            description: "Brand identity and art direction for Halatia Paris — a Parisian eau de parfum built around the concept of halation, a vintage film aesthetic, and an orange signature colour.",
            year: "2025",
          },
          {
            href: "/work/unfold-agency",
            category: "Brand Identity",
            title: "Unfold Agency",
            subtitle: "Brand identity · Creative agency",
            description: "Brand identity for Unfold Agency built around the metaphor of origami — transforming raw ideas into structured, elevated work. Origami crane logo mark, sky blue and navy palette, League Spartan and Playfair Display typography.",
            year: "2025",
          },
          {
            href: "/work/the-outfiters",
            category: "Art Direction",
            title: "The Outfiters",
            subtitle: "Artistic direction · Vietnamese streetwear",
            description: "Artistic direction for a project selling Vietnamese streetwear to European markets — Instagram strategy, mood board curation and brand identity.",
            year: "2025",
          },
          {
            href: "/work/b1nbags-process",
            category: "Creative Process",
            title: "B1NBAGS Process",
            subtitle: "Brand identity · Screen-printing · Photography · Film",
            description: "The physical and digital creative process behind B1NBAGS — from Photoshop bitmap exports to screen-printing, Lumix S5II photography with film colour profiles, and two years of DaVinci Resolve colour grading research.",
            year: "2023 – 2025",
          },
          {
            href: "/work/ruinarktefact-process",
            category: "Creative Process",
            title: "Ruinarktefact Process",
            subtitle: "Campaign identity · Art direction · Short film",
            description: "The full creative process behind the VOLCAN'ARCHIK BDE campaign — mascot design in Procreate and Illustrator, 3D name renders in Blender and Photoshop, and the production of a 20-minute declaration short film on Sony FX3.",
            year: "2024 – 2025",
          },
        ].map((item, i, arr) => (
          <div key={item.href} style={{ borderTop: "1px solid var(--line)", paddingTop: 24, marginBottom: i < arr.length - 1 ? 48 : 0 }}>
            <div style={{ fontWeight: 300, fontSize: 9, letterSpacing: "0.26em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 20 }}>
              {item.category}
            </div>
            <Link
              href={item.href}
              style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, textDecoration: "none" }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 26, letterSpacing: "-0.01em", color: "#fff", lineHeight: 1.1 }}>
                  {item.title}
                </div>
                <div style={{ marginTop: 8, fontWeight: 300, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
                  {item.subtitle}
                </div>
                <p style={{ marginTop: 12, fontWeight: 300, fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, maxWidth: 560 }}>
                  {item.description}
                </p>
              </div>
              <div style={{ fontWeight: 300, fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em", whiteSpace: "nowrap", paddingTop: 4 }}>
                {item.year}
              </div>
            </Link>
          </div>
        ))}

        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 24 }}>
          <div style={{ fontWeight: 300, fontSize: 9, letterSpacing: "0.26em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 20 }}>
            Photography
          </div>
          <p style={{ fontWeight: 300, fontSize: 15, color: "var(--text-2)", lineHeight: 1.8 }}>
            Coming soon.
          </p>
        </div>

      </section>

      <Footer />
    </main>
  );
}
