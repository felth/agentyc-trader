import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Mark pdf-parse as external to avoid bundling issues in serverless
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push("pdf-parse");
      } else {
        config.externals = [...(config.externals as any[]), "pdf-parse"];
      }
    }
    return config;
  },
};

export default nextConfig;
