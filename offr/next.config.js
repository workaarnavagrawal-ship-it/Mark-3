/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: [] },
  // In local dev, proxy /api/py/* to the FastAPI backend on port 8000.
  // In production (Vercel), vercel.json handles this routing instead.
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [
      {
        source: "/api/py/:path*",
        destination: "http://localhost:8000/api/py/:path*",
      },
    ];
  },
};
module.exports = nextConfig;
