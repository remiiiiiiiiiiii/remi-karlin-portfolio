import Footer from "@/components/Footer";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "About Remi Karlin, Art Director",
  description:
    "Paris-based art director, raised in Hong Kong, half French and half Chinese. Brand identities and campaigns, and the films and photographs that carry them.",
  path: "/about",
  ogType: "profile",
});

export default function AboutPage() {
  return (
    <main className="page about-page">
      <header className="page-header" style={{ paddingBottom: 32 }}>
        <div className="page-eyebrow">About</div>
        <h1 className="page-title">Remi Karlin</h1>
      </header>
      <section style={{ maxWidth: 780, margin: "0 auto", padding: "0 var(--pad-x) 96px" }}>
        {/* Portrait */}
        <div style={{ marginBottom: 48 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/portrait.webp"
            alt="Remi Karlin"
            style={{
              width: "100%",
              maxWidth: 400,
              aspectRatio: "3 / 4",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>

        {/* Bio */}
        <div
          style={{
            fontWeight: 300,
            fontSize: 15,
            lineHeight: 1.8,
            color: "var(--text-2)",
          }}
        >
          <p>
            I&apos;m an art director based in Paris. I grew up in Hong Kong, half French and half Chinese, with an ink artist for a mum, and art classes all through school taught me that good work comes from process: plan, research, iterate, refine.
          </p>
          <p style={{ marginTop: "1.4em" }}>
            In Hong Kong I started B1NBAGS, a label of reworked vintage clothing and t-shirts, all screen-printed by hand, and taught myself product, visuals and marketing along the way. It is on pause for now.
          </p>
          <p style={{ marginTop: "1.4em" }}>
            At ESSEC I joined creative associations and took on filming, editing and creative production, most intensely on the year-long Ruinarktefact campaign. In 2026 I spent six months as an editor and art director at Havas Play in Paris, working on KFC, Allianz, Sanofi and others.
          </p>
          <p style={{ marginTop: "1.4em" }}>
            The personal work on this site I made myself, from pre-production to colour grading to the website.
          </p>
          <ul
            style={{
              listStyle: "none",
              margin: "48px 0 0",
              padding: 0,
              fontWeight: 300,
              fontSize: 11,
              letterSpacing: "0.04em",
              lineHeight: 2,
              color: "var(--text-dim)",
            }}
          >
            <li>Havas Play · Editor and Art Director · Paris · Jan to Jun 2026</li>
            <li>ESSEC Business School · Global BBA · Class of 2027</li>
          </ul>
        </div>
      </section>
      <Footer />
    </main>
  );
}
