"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Selected Works", match: (p: string) => p === "/" || p.startsWith("/work") },
  { href: "/video-work", label: "Video Work", match: (p: string) => p.startsWith("/video-work") },
  { href: "/other-work", label: "Other Work", match: (p: string) => p.startsWith("/other-work") },
  { href: "/about", label: "About", match: (p: string) => p.startsWith("/about") },
];

export default function Nav() {
  const pathname = usePathname() || "/";

  return (
    <nav className="nav" id="nav" aria-label="Primary">
      <Link className="nav-logo" href="/">
        Remi Karlin
      </Link>
      <div className="nav-links">
        {LINKS.map((l) => {
          const active = l.match(pathname);
          return (
            <Link key={l.href} href={l.href} className={`nav-link${active ? " active" : ""}`}>
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
