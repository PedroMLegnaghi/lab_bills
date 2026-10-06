import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image. Vercel packages the app its own way.
  output: process.env.VERCEL ? undefined : "standalone",
  experimental: {
    serverActions: {
      // Receipts are capped at 4 MB (src/lib/uploads.ts) because Vercel itself refuses bodies
      // over 4.5 MB; this leaves room for multipart overhead.
      bodySizeLimit: "4500kb",
    },
  },
};

export default nextConfig;
