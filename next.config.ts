import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // For Docker deployments
  experimental: {
    outputFileTracingRoot: undefined, // Add if needed
  },
  // Enable if deploying to a subdirectory
  // basePath: '/yt-downloader',
};

export default nextConfig;
