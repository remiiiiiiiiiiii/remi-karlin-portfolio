import Footer from "@/components/Footer";

export const metadata = {
  title: "About — Remi Karlin",
  description: "About Remi Karlin — filmmaker, cinematographer and artistic director.",
};

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
            src="/images/portrait.jpg"
            alt="Remi Karlin"
            style={{
              width: "100%",
              maxWidth: 400,
              aspectRatio: "3 / 4",
              objectFit: "cover",
              display: "block",
              filter: "grayscale(15%)",
            }}
          />
          <div style={{
            marginTop: 10,
            fontWeight: 300,
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--text-dim)",
          }}>
            Remi Karlin · Hong Kong, 2025
          </div>
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
            I&apos;m a Hong Kong–raised, half French–half Chinese filmmaker and creative.
          </p>
          <p style={{ marginTop: "1.4em" }}>
            Growing up with an artist for a mum and taking art all through high school, I learned
            early that good work comes from process: plan, research, iterate, refine. That mindset
            still drives how I build visuals today.
          </p>
          <p style={{ marginTop: "1.4em" }}>
            A big turning point was being recruited to model for BAPE in Hong Kong. On set, I
            watched ideas turn into campaigns — creative direction, teamwork, tight timelines. It
            pulled me into the world behind the camera. I launched a small clothing brand,
            B1nbags, in Hong Kong and taught myself the basics of product, visuals, and marketing.
            That&apos;s when creativity and entrepreneurship clicked for me.
          </p>
          <p style={{ marginTop: "1.4em" }}>
            At university, I joined creative associations and took on creative direction, content
            creation, and organisation. The most intense stretch was our year-long BDE campaign:
            two teams of 35 competing through events and communications. I spent one summer in
            deep practice operating a cinema-grade camera, lighting scenes, recording clean audio,
            and delivering in post with editing and colour grading. Since then I&apos;ve focused on
            filmmaking, cinematography, editing, and creative direction — telling clear, honest
            stories in both short and long formats.
          </p>
          <p style={{ marginTop: "1.4em" }}>
            All the creative work on this website has been done completely by myself, from
            pre-production, filming, lighting, sound design, colour grading, post-production, to
            website design.
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
