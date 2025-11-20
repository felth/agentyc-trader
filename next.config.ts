import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {},
  // Removed webpack external config for pdf-parse - let it bundle normally
  // pdf-parse will be bundled with the serverless function
};

export default nextConfig;
