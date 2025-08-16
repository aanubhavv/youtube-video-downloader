import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // For Docker deployments
  // Enable if deploying to a subdirectory
  // basePath: '/yt-downloader',
};

export default nextConfig;
