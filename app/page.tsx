import type { Metadata } from "next";
import Bio from "@/components/Bio";
import FeaturedGrid from "@/components/FeaturedGrid";
import type { FeaturedItem } from "@/components/FeaturedGrid";
import Footer from "@/components/Footer";
import HeroFrame from "@/components/HeroFrame";
import type { HeroItem } from "@/components/HeroFrame";
import WorkIndex from "@/components/WorkIndex";
import type { IndexRow } from "@/components/WorkIndex";
import { getHeroProjects, getIndexProjects, groupOf } from "@/components/landing-data";
import { getHeroClips } from "@/lib/projects";
import { posterPath } from "@/lib/posters";
import { pageMeta, HOME_TITLE, HOME_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  path: "/",
});

export default function Page() {
  // Featured projects (numeric `featured` in data/projects.json) fill the hero, in order.
  const hero = getHeroProjects();

  const heroItems: HeroItem[] = hero.map((p) => ({
    slug: p.slug,
    title: p.title,
    label: [p.tag, p.location, p.year].filter(Boolean).join(" · "),
    clips: getHeroClips(p),
  }));

  const gridItems: FeaturedItem[] = hero.map((p) => ({
    slug: p.slug,
    title: p.title,
    label: [p.tag, p.year].filter(Boolean).join(" · "),
    poster: p.poster || posterPath(p.previewVideo),
    tiny: p.poster ? p.poster.replace(/\.webp$/, "-tiny.webp") : posterPath(p.previewVideo, true),
  }));

  const rows: IndexRow[] = getIndexProjects().map((p) => ({
    slug: p.slug,
    title: p.title,
    tag: p.tag,
    location: p.location,
    year: p.year,
    group: groupOf(p),
    still: p.thumbnail || undefined,
    fallback: p.previewVideo ? posterPath(p.previewVideo) : undefined,
  }));

  return (
    <main className="page home" id="main">
      <a className="skip" href="#work">
        Skip to work
      </a>
      <h1 className="vh">Remi Karlin: filmmaker, cinematographer and artistic director in Hong Kong and Paris</h1>
      {heroItems.length > 0 && (
        <>
          <div className="hero-d">
            <HeroFrame items={heroItems} />
          </div>
          <div className="hero-m">
            <FeaturedGrid items={gridItems} />
          </div>
        </>
      )}
      <Bio />
      <WorkIndex rows={rows} />
      <Footer />
    </main>
  );
}
