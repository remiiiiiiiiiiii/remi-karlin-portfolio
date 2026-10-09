"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type IndexRow = {
  slug: string;
  title: string;
  tag: string;
  location: string;
  year: string;
  group: "films" | "cases";
  /** Preferred still (project thumbnail) */
  still?: string;
  /** Fallback still (preview poster) */
  fallback?: string;
};

type Filter = "all" | IndexRow["group"];

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "films", label: "Films" },
  { key: "cases", label: "Case studies" },
];

const pad = (n: number) => String(n).padStart(2, "0");

/** 2.39:1 still. A missing thumbnail falls back to the poster, then to an empty frame. */
function Still({ src, fallback }: { src?: string; fallback?: string }) {
  const [current, setCurrent] = useState<string | undefined>(src || fallback);
  const [broken, setBroken] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  const fail = () => {
    if (current && current === src && fallback && fallback !== src) setCurrent(fallback);
    else setBroken(true);
  };

  // An image that failed before hydration never fires onError on the client.
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) fail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span className="lg-thumb">
      {current && !broken && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={ref}
          src={current}
          alt=""
          width={640}
          height={360}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={fail}
        />
      )}
    </span>
  );
}

export default function WorkIndex({ rows }: { rows: IndexRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const count = (k: Filter) => (k === "all" ? rows.length : rows.filter((r) => r.group === k).length);

  return (
    <section className="ix" id="work" aria-label="Work index">
      <div className="ix-head">
        <h2 className="ix-h">Work</h2>
        <div className="seg" role="group" aria-label="Filter by type">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}
              <span className="c">{pad(count(f.key))}</span>
            </button>
          ))}
        </div>
      </div>
      <ol className="log">
        {rows.map((r, i) => (
          <li key={r.slug} hidden={filter !== "all" && r.group !== filter}>
            <Link href={`/work/${r.slug}`}>
              <span className="lg-no">{pad(i + 1)}</span>
              <Still src={r.still} fallback={r.fallback} />
              <span className="lg-main">
                <span className="lg-title">{r.title}</span>
                <span className="lg-sub label">
                  {r.tag} · {r.location}
                </span>
              </span>
              <span className="lg-type">{r.tag}</span>
              <span className="lg-place">{r.location}</span>
              <span className="lg-year">{r.year}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
