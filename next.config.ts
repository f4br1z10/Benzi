import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
  outputFileTracingIncludes: {
    "/api/quotes/*/pdf": ["./node_modules/playwright/.local-browsers/**/*"]
  }
};

export default nextConfig;
