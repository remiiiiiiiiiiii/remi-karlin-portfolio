import Link from "next/link";

export type FeaturedItem = {
  slug: string;
  title: string;
  /** "tag · year" */
  label: string;
  poster: string;
  tiny: string;
};

const MOBILE_QUERY = "(max-width: 768px)";
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Phone hero: name + role, then the featured works as a 2-column grid of stills.
 * No <video> anywhere; the CSS shows this section only at 768px and below.
 * The first two posters are eager, and only on phones: on wider screens this section is
 * display:none, so those two use <picture> and fall back to the 24px blur-up there.
 */
export default function FeaturedGrid({ items }: { items: FeaturedItem[] }) {
  return (
    <section className="hm" aria-label="Chosen work">
      <div className="hm-intro">
        <p className="hm-name">Remi Karlin</p>
        <p className="hm-role label">Filmmaker · Cinematographer · Artistic Director</p>
      </div>
      <ol className="hm-grid">
        {items.map((it, i) => {
          const imgProps = {
            alt: "",
            width: 1280,
            height: 720,
            decoding: "async" as const,
            draggable: false,
            style: { backgroundImage: `url(${it.tiny})` },
          };
          return (
            <li key={it.slug}>
              <Link className="hm-card" href={`/work/${it.slug}`}>
                <span className="hm-img">
                  {i < 2 ? (
                    <picture>
                      <source media={MOBILE_QUERY} srcSet={it.poster} />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.tiny} loading="eager" {...imgProps} />
                    </picture>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.poster} loading="lazy" {...imgProps} />
                  )}
                </span>
                <span className="hm-num">{pad(i + 1)}</span>
                <span className="hm-title">{it.title}</span>
                <span className="hm-meta label">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
