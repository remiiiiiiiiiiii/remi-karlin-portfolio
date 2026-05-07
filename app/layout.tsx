import type { Metadata } from "next";
import "./globals.css";
import Cursor from "@/components/Cursor";
import Nav from "@/components/Nav";
import ScrollRoot from "@/components/ScrollRoot";
import PageTransition from "@/components/PageTransition";

export const metadata: Metadata = {
  title: "Remi Karlin — Filmmaker",
  description:
    "Filmmaker, cinematographer and creative director working between Hong Kong and Paris.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Critical CSS inlined as first body element — applies before any nav HTML is painted */}
        <style dangerouslySetInnerHTML={{ __html: `
          body { margin: 0; background: #000; color: #fff; overflow: hidden; }
          .nav {
            position: fixed !important;
            top: 0 !important; left: 0; right: 0;
            z-index: 100;
            display: grid !important;
            grid-template-columns: 1fr auto;
            align-items: center;
            padding: 22px 48px;
            background: transparent;
          }
          .nav-logo { color: #fff !important; text-decoration: none; font-weight: 700; font-size: 13px; }
          .nav-links { display: flex; gap: 40px; align-items: center; }
          .nav-link { color: rgba(255,255,255,0.62) !important; text-decoration: none; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; }
          .nav-hamburger { display: none; }
        ` }} />
        <Cursor />
        <Nav />
        <ScrollRoot>
          <PageTransition>{children}</PageTransition>
        </ScrollRoot>
      </body>
    </html>
  );
}
