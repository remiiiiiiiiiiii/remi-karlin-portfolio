import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="page" style={{ minHeight: "100vh", position: "relative", zIndex: 2 }}>
      <header className="page-header">
        <div className="page-eyebrow">404</div>
        <h1 className="page-title">Page not found</h1>
        <p className="page-subtitle">
          This page does not exist or has moved.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            marginTop: 40,
            fontWeight: 300,
            fontSize: 9,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            color: "var(--text)",
            borderBottom: "1px solid var(--text-2)",
            paddingBottom: 4,
          }}
        >
          Back to home
        </Link>
      </header>
    </main>
  );
}
