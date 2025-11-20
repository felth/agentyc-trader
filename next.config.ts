import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // For Vercel serverless: ensure pdf-parse is externalized and available in node_modules
  // This tells Next.js NOT to bundle it, but to resolve it from node_modules at runtime
  serverExternalPackages: ["pdf-parse"],
  // Configure webpack to properly handle pdf-parse as external
  // Note: Using webpack config with Turbopack requires explicit --webpack flag or removing turbopack config
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize pdf-parse - don't bundle it, resolve from node_modules
      const externalizePdfParse = (request: string) => {
        return request === "pdf-parse" || request?.includes("pdf-parse");
      };

      if (Array.isArray(config.externals)) {
        // Add to array if not already present
        if (!config.externals.includes("pdf-parse")) {
          config.externals.push("pdf-parse");
        }
      } else if (typeof config.externals === "function") {
        const originalExternals = config.externals;
        config.externals = (context: any, request: string, callback: any) => {
          // Externalize pdf-parse
          if (externalizePdfParse(request)) {
            return callback(null, `commonjs ${request}`);
          }
          return originalExternals(context, request, callback);
        };
      } else {
        // Initialize as function if not set
        config.externals = (context: any, request: string, callback: any) => {
          if (externalizePdfParse(request)) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        };
      }
    }
    return config;
  },
};

export default nextConfig;
