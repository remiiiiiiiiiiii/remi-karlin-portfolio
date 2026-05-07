import fs from "fs";
import path from "path";
import Link from "next/link";
import { projects } from "@/lib/projects";
import BackButton from "@/components/BackButton";
import PhotoCarousel from "@/components/PhotoCarousel";
import PhotoGallery from "@/components/PhotoGallery";
import Footer from "@/components/Footer";

export const metadata = {
  title: "The Outfiters — Remi Karlin",
  description:
    "Artistic direction for a project selling Vietnamese streetwear to European markets.",
};

const LOGO_FILE = "out fiters vn (5).png";

function readImageDir(folder: string, exclude?: string): string[] {
  const dir = path.join(process.cwd(), "public", "images", folder);
  try {
    return fs
      .readdirSync(dir)
      .filter(
        (f) =>
          /\.(jpe?g|png|webp|gif)$/i.test(f) &&
          (!exclude || f !== exclude)
      )
      .sort()
      .map((f) => `/images/${folder}/${encodeURIComponent(f)}`);
  } catch {
    return [];
  }
}

export default function OutfitersPage() {
  const logoSrc = `/images/the-outfiters-brand/${encodeURIComponent(LOGO_FILE)}`;
  const brandImages = readImageDir("the-outfiters-brand", LOGO_FILE);
  const moodImages = readImageDir("the-outfiters-mood");

  const idx = projects.findIndex((p) => p.slug === "the-outfiters");
  const prev = idx > 0 ? projects[idx - 1] : null;
  const next = idx < projects.length - 1 ? projects[idx + 1] : null;

  return (
    <main className="page project-page" style={{ background: "var(--bg)" }}>
      <BackButton />

      {/* Header — no video, title + description with logo on the right */}
      <header
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "140px var(--pad-x) 64px",
        }}
      >
        <div
          className="project-eyebrow"
          style={{ color: "rgba(255,255,255,0.45)", marginBottom: 18 }}
        >
          Art Direction
        </div>
        <h1
          style={{
            fontWeight: 800,
            fontSize: "clamp(48px, 8vw, 96px)",
            letterSpacing: "-0.03em",
            lineHeight: 0.88,
            color: "#fff",
            margin: "0 0 20px",
          }}
        >
          The Outfiters
        </h1>
        <div
          style={{
            fontWeight: 300,
            fontSize: 14,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.55)",
            marginBottom: 32,
          }}
        >
          Artistic direction · Vietnamese streetwear
        </div>

        {/* Description left, logo right */}
        <div style={{ display: "flex", gap: 48, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontWeight: 300,
                fontSize: 15,
                lineHeight: 1.8,
                color: "var(--text-2)",
                margin: 0,
              }}
            >
              Artistic direction for a small project selling Vietnamese streetwear
              to European markets. The goal was to build an Instagram account that
              represented a mood board of the style and lifestyle we wanted to
              project to our audience — and within that mood board, mix in the
              Vietnamese brands to sell in Europe using the mood we had built up on
              the page.
            </p>
            <div
              style={{
                marginTop: 24,
                display: "flex",
                gap: "16px 40px",
                flexWrap: "wrap",
                fontWeight: 200,
                fontSize: 9,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              <span>2025</span>
              <span>Paris / Vietnam</span>
              <span>Art Direction · Instagram</span>
            </div>
          </div>

          {/* Logo — large, right-aligned, pulled up */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt="The Outfiters logo"
            style={{
              width: "clamp(280px, 40vw, 540px)",
              flexShrink: 0,
              display: "block",
            }}
          />
        </div>
      </header>

      {/* Brand board carousel */}
      {brandImages.length > 0 && (
        <section
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            borderTop: "1px solid var(--line)",
            padding: "48px var(--pad-x) 0",
          }}
        >
          <div className="project-section-label" style={{ marginBottom: 24 }}>
            Brand board
          </div>
          <PhotoCarousel images={brandImages} alt="Brand" centerFit="contain" />
        </section>
      )}

      {/* Mood board gallery — all images visible when scrolling */}
      {moodImages.length > 0 && (
        <section
          style={{
            maxWidth: 1200,
            margin: "48px auto 0",
            borderTop: "1px solid var(--line)",
            padding: "48px var(--pad-x) 0",
          }}
        >
          <div className="project-section-label" style={{ marginBottom: 24 }}>
            Mood board inspiration
          </div>
          <PhotoGallery images={moodImages} alt="Mood" columns={4} />
        </section>
      )}

      {/* Prev / Next */}
      <nav
        className="project-prev-next"
        aria-label="Project navigation"
        style={{ marginTop: 96 }}
      >
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
