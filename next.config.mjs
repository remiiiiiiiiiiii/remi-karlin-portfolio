/** @type {import('next').NextConfig} */
const assetCache = [
  { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
];

const nextConfig = {
  reactStrictMode: true,
  // /video-work and /other-work were folded into the homepage work index.
  async redirects() {
    return [
      { source: "/video-work", destination: "/#work", permanent: true },
      { source: "/other-work", destination: "/#work", permanent: true },
      // process pages were folded into their project pages
      { source: "/work/b1nbags-process", destination: "/work/b1nbags#process", permanent: true },
      { source: "/work/ruinarktefact-process", destination: "/work/ruinarktefact#process", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/videos/:path*", headers: assetCache },
      { source: "/images/:path*", headers: assetCache },
      { source: "/fonts/:path*", headers: assetCache },
    ];
  },
};

export default nextConfig;
