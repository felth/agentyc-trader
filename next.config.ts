import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {},
  // For Vercel serverless: ensure pdf-parse is available via node_modules
  // Don't bundle it - let it be resolved from node_modules at runtime
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure pdf-parse is externalized so it can be resolved from node_modules
      // Vercel installs dependencies, so this should work
      if (Array.isArray(config.externals)) {
        if (!config.externals.includes("pdf-parse")) {
          config.externals.push("pdf-parse");
        }
      } else if (typeof config.externals === "function") {
        const originalExternals = config.externals;
        config.externals = (context: any, request: string, callback: any) => {
          // Externalize pdf-parse so it uses node_modules
          if (request === "pdf-parse" || request?.includes("/pdf-parse/")) {
            return callback(null, `commonjs ${request}`);
          }
          return originalExternals(context, request, callback);
        };
      } else {
        // Initialize externals as array if not set
        config.externals = ["pdf-parse"];
      }
    }
    return config;
  },
  // Mark as external so it's available in node_modules at runtime
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
