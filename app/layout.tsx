import type { Metadata } from "next";
import "./globals.css";
import Cursor from "@/components/Cursor";
import Nav from "@/components/Nav";
import ScrollRoot from "@/components/ScrollRoot";
import PageTransition from "@/components/PageTransition";
import {
  SITE_URL,
  SITE_NAME,
  HOME_TITLE,
  HOME_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  siteJsonLd,
  jsonLdScript,
} from "@/lib/seo";

// Canonical is set per page (pageMeta), never here, so it cannot leak "/" onto other routes.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: HOME_TITLE,
    // Each page writes its full title (brand included), so no suffix is added here.
    template: "%s",
  },
  description: HOME_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_GB",
    title: HOME_TITLE,
    description:
      "Filmmaker and cinematographer between Hong Kong and Paris. Documentary, brand film and music video work.",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Remi Karlin, filmmaker and cinematographer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: "Filmmaker and cinematographer between Hong Kong and Paris.",
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-video-preview": -1 },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {jsonLdScript(siteJsonLd)}
        <Cursor />
        <Nav />
        <ScrollRoot>
          <PageTransition>{children}</PageTransition>
        </ScrollRoot>
      </body>
    </html>
  );
}
