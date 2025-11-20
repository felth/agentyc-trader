import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {},
  // Note: pdf-parse is a native Node.js module that requires runtime resolution
  // It's handled via eval('require') to avoid build-time bundling issues
  // The module must be in package.json dependencies (not devDependencies)
};

export default nextConfig;
