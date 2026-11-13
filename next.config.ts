import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // "*.dev.tsx" pages (the local playground at /dev) exist only in development.
  pageExtensions: isDev
    ? ["tsx", "ts", "jsx", "js", "dev.tsx"]
    : ["tsx", "ts", "jsx", "js"],
  turbopack: {
    // Pin the workspace root to this folder (a stray lockfile higher up
    // would otherwise be picked as the root).
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
