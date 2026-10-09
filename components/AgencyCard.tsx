import Link from "next/link";
import { countGalleryImages, type Project } from "@/lib/projects";
import { posterPath } from "@/lib/posters";

type Props = {
  p: Project;
  /** Hub style: also shows the role line and "n films · m visuals". Default is thumbnail + title only. */
  detail?: boolean;
  /** Overrides for hub links that point at a section of another project's page. */
  href?: string;
  title?: string;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Agency project tile (hub grid, "More from" strip on project pages). 2.39:1 still, then text. */
export default function AgencyCard({ p, detail = false, href, title }: Props) {
  const still = p.thumbnail || (p.previewVideo ? posterPath(p.previewVideo) : "");
  const films = p.videos.length;
  const visuals = countGalleryImages(p);
  const counts = [films > 0 ? plural(films, "film") : "", visuals > 0 ? plural(visuals, "visual") : ""]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link className="havas-card" href={href ?? `/work/${p.slug}`}>
      <span className="havas-card-thumb">
        {still && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={still} alt="" width={640} height={268} loading="lazy" decoding="async" draggable={false} />
        )}
      </span>
      <span className="havas-card-name">{title ?? p.title}</span>
      {detail && p.roles.length > 0 && <span className="havas-card-role">{p.roles.join(" · ")}</span>}
      {detail && counts && <span className="havas-card-count">{counts}</span>}
    </Link>
  );
}
