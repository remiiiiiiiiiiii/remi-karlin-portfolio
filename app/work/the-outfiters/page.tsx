import Link from "next/link";
import { projects } from "@/lib/projects";
import BackButton from "@/components/BackButton";
import SlideDeck from "@/components/SlideDeck";
import MilanoteEmbed from "@/components/MilanoteEmbed";
import Footer from "@/components/Footer";
import brandImages from "@/data/outfiters-brand-images.json";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "The Outfiters — Remi Karlin",
  description: "Art direction for The Outfiters, a project started with friends to bring Vietnamese streetwear to European buyers. It never took off. Brand board, logo system and mood board.",
  path: "/work/the-outfiters",
});

const MOODBOARD_URL = "https://app.milanote.com/1XfiCd1keSSa5d?p=iuDdY4z8Qcs";
// paste the src of Milanote's embed code here (Share → read-only link → Generate HTML embed code)
const MOODBOARD_EMBED = "https://app.milanote.com/1XfiCd1keSSa5d?p=iuDdY4z8Qcs";
// Whole-board picture shown first (the live frame opens on an empty corner at 100%). Refresh after editing the
// board: npm run moodboard -- "<read-only link>" public/images/the-outfiters/moodboard.webp
const MOODBOARD_SNAPSHOT = { src: "/images/the-outfiters/moodboard.webp", tiny: "/images/the-outfiters/moodboard-tiny.webp", width: 2400, height: 3076 };

const LOGO_SRC = `/images/the-outfiters-brand/${encodeURIComponent("out fiters vn (5).webp")}`;

export default function OutfitersPage() {
  const idx = projects.findIndex((p) => p.slug === "the-outfiters");
  const prev = idx > 0 ? projects[idx - 1] : null;
  const next = idx < projects.length - 1 ? projects[idx + 1] : null;

  return (
    <main className="page project-page" style={{ background: "var(--bg)" }}>
      <BackButton />

      <header style={{ maxWidth: 1200, margin: "0 auto", padding: "140px var(--pad-x) 64px" }}>
        <div className="project-eyebrow" style={{ color: "rgba(255,255,255,0.45)", marginBottom: 18 }}>
          Art Direction
        </div>
        <h1 style={{ fontWeight: 800, fontSize: "clamp(48px, 8vw, 96px)", letterSpacing: "-0.03em", lineHeight: 0.88, color: "#fff", margin: "0 0 20px" }}>
          The Outfiters
        </h1>
        <div style={{ fontWeight: 300, fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 32 }}>
          Art direction · Vietnamese streetwear
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "32px 48px", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 320px", minWidth: 0 }}>
            <p style={{ fontWeight: 300, fontSize: 15, lineHeight: 1.8, color: "var(--text-2)", margin: 0 }}>
              Art direction for The Outfiters, a project started with friends to bring Vietnamese streetwear to European buyers. It never took off. Remi came up with the name and did all the art direction: the identity, and a mood board of the style and lifestyle the brand was meant to stand for, built to frame the Vietnamese labels it would sell. Friends led the product and business side.
            </p>
            <div style={{ marginTop: 24, display: "flex", gap: "16px 40px", flexWrap: "wrap", fontWeight: 200, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
              <span>2025</span>
              <span>Paris / Vietnam</span>
              <span>Art Direction</span>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt="The Outfiters logo" style={{ width: "clamp(220px, 40vw, 540px)", maxWidth: "100%", flexShrink: 0, display: "block" }} />
        </div>
      </header>

      {brandImages.length > 0 && (
        <section className="project-section" style={{ paddingBottom: 0 }}>
          <div className="project-section-label">Brand board</div>
          <SlideDeck images={brandImages} alt="The Outfiters brand board" />
        </section>
      )}

      <section className="project-section" style={{ paddingBottom: 0 }}>
        <div className="project-section-label">Mood board</div>
        <MilanoteEmbed
          src={MOODBOARD_EMBED}
          title="The Outfiters mood board"
          boardUrl={MOODBOARD_URL}
          snapshot={MOODBOARD_SNAPSHOT}
        />
      </section>

      <nav className="project-prev-next" aria-label="Project navigation" style={{ marginTop: 96 }}>
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
