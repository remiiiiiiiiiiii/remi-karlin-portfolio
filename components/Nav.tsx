"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const LINKS = [
  { href: "/", label: "Selected Works", match: (p: string) => p === "/" || p.startsWith("/work") },
  { href: "/video-work", label: "Video Work", match: (p: string) => p.startsWith("/video-work") },
  { href: "/other-work", label: "Other Work", match: (p: string) => p.startsWith("/other-work") },
  { href: "/about", label: "About", match: (p: string) => p.startsWith("/about") },
];

export default function Nav() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);

  // Close menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Close menu on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <nav className="nav" id="nav" aria-label="Primary">
        <Link className="nav-logo" href="/">
          Remi Karlin
        </Link>

        {/* Desktop links */}
        <div className="nav-links nav-links-desktop">
          {LINKS.map((l) => {
            const active = l.match(pathname);
            return (
              <Link key={l.href} href={l.href} className={`nav-link${active ? " active" : ""}`}>
                {l.label}
              </Link>
            );
          })}
        </div>

        {/* Mobile hamburger */}
        <button
          className="nav-hamburger"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          <span className={`hamburger-line${open ? " open" : ""}`} />
          <span className={`hamburger-line${open ? " open" : ""}`} />
          <span className={`hamburger-line${open ? " open" : ""}`} />
        </button>
      </nav>

      {/* Mobile dropdown */}
      <div className={`nav-mobile-dropdown${open ? " is-open" : ""}`} aria-hidden={!open}>
        {LINKS.map((l) => {
          const active = l.match(pathname);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-mobile-link${active ? " active" : ""}`}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          );
        })}
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="nav-mobile-backdrop"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
