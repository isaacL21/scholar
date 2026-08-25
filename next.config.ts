import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // On Replit, backend runs on port 8000 of the same host.
    // NEXT_PUBLIC_BACKEND_URL can be set via Replit Secrets if needed.
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    return [
      {
        source: "/api/backend/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
  // Allow Replit's preview domain as an image host (future-proofing)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.replit.dev" },
      { protocol: "https", hostname: "*.repl.co" },
    ],
  },
};

export default nextConfig;
