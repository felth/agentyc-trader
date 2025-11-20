import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {},
  // Configure webpack to ensure pdf-parse is bundled (not externalized)
  // This is critical for Vercel serverless functions
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Remove pdf-parse from externals if present - we need it bundled
      if (Array.isArray(config.externals)) {
        config.externals = config.externals.filter(
          (ext: any) => ext !== "pdf-parse" && (typeof ext !== "string" || !ext.includes("pdf-parse"))
        );
      } else if (typeof config.externals === "function") {
        const originalExternals = config.externals;
        config.externals = (context: any, request: string, callback: any) => {
          if (request === "pdf-parse" || request?.includes("pdf-parse")) {
            // Don't externalize - bundle it
            return callback();
          }
          return originalExternals(context, request, callback);
        };
      }
      // Ensure pdf-parse can be resolved
      config.resolve = config.resolve || {};
      config.resolve.alias = config.resolve.alias || {};
    }
    return config;
  },
  // Use serverExternalPackages to ensure pdf-parse is available at runtime
  // This tells Next.js to include it in the serverless bundle
  serverExternalPackages: [],
};

export default nextConfig;
