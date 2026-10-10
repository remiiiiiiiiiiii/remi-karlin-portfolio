"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ROLE = "Filmmaker · Cinematographer · Art Director";

export default function Nav() {
  const pathname = usePathname() || "/";
  const [visible, setVisible] = useState(false);
  const [solid, setSolid] = useState(false);

  // Fade in nav after mount — prevents unstyled flash before CSS loads
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Transparent at the top of the page, solid once the top sentinel (first child of
  // #scrollRoot, see layout.tsx) has scrolled out. Scrolling happens inside #scrollRoot.
  useEffect(() => {
    const sentinel = document.getElementById("top-sentinel");
    if (!sentinel) return;
    const io = new IntersectionObserver(([en]) => setSolid(!en.isIntersecting), {
      root: document.getElementById("scrollRoot"),
    });
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  const visibilityStyle = {
    opacity: visible ? 1 : 0,
    transition: visible ? "opacity 0.25s ease" : "none",
  } as React.CSSProperties;

  const goToWork = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Already on the homepage: scroll #scrollRoot to the index ourselves (no route change needed).
    if (pathname !== "/") return;
    const el = document.getElementById("work");
    if (!el) return;
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    window.history.replaceState(null, "", "/#work");
  };

  return (
    <nav
      className={`nav${solid ? " is-solid" : ""}`}
      id="nav"
      aria-label="Primary"
      style={{ position: "fixed", top: 0, left: 0, right: 0, ...visibilityStyle }}
    >
      <div className="nav-brand">
        <Link className="nav-logo" href="/">
          Remi Karlin
        </Link>
        <span className="nav-role">{ROLE}</span>
      </div>
      <div className="nav-links">
        <Link className="nav-link" href="/#work" onClick={goToWork}>
          Work
        </Link>
        <Link className={`nav-link${pathname.startsWith("/about") ? " active" : ""}`} href="/about">
          About
        </Link>
        <a className="nav-link" href="mailto:remikarlin@gmail.com">
          Contact
        </a>
      </div>
    </nav>
  );
}
