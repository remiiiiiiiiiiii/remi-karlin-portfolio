/** @type {import('next').NextConfig} */
const assetCache = [
  { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      { source: "/videos/:path*", headers: assetCache },
      { source: "/images/:path*", headers: assetCache },
      { source: "/fonts/:path*", headers: assetCache },
    ];
  },
};

export default nextConfig;
