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
      <head>
        {/* Critical nav styles inlined to prevent flash before globals.css loads */}
        <style dangerouslySetInnerHTML={{ __html: `
          body { margin: 0; background: #000; color: #fff; overflow: hidden; }
          .nav {
            position: fixed !important;
            top: 0; left: 0; right: 0;
            z-index: 100;
            display: grid;
            grid-template-columns: 1fr auto;
            align-items: center;
            padding: 22px 48px;
            background: transparent;
          }
          .nav-logo { color: #fff; text-decoration: none; font-weight: 700; font-size: 13px; }
          .nav-link { color: rgba(255,255,255,0.62); text-decoration: none; }
        ` }} />
      </head>
      <body>
        <Cursor />
        <Nav />
        <ScrollRoot>
          <PageTransition>{children}</PageTransition>
        </ScrollRoot>
      </body>
    </html>
  );
}
