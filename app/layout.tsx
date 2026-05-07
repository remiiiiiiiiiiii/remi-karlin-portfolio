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
        <Cursor />
        <Nav />
        <ScrollRoot>
          <PageTransition>{children}</PageTransition>
        </ScrollRoot>
      </body>
    </html>
  );
}
