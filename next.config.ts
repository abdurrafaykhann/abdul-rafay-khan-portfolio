import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/** The Supabase project's host: images and videos come from its storage. */
function supabaseHost(): string | null {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).host : null;
  } catch {
    return null;
  }
}

/**
 * Content-Security-Policy. Next.js adds small inline scripts, so scripts allow
 * 'unsafe-inline' (a per-request nonce would make every page dynamic and lose
 * static rendering). Everything else is locked to this site and Supabase.
 * The private /admin area also allows 'unsafe-eval' (its Mermaid preview).
 */
function csp({ admin }: { admin: boolean }): string {
  const sb = supabaseHost();
  const scripts = ["'self'", "'unsafe-inline'"];
  if (isDev || admin) scripts.push("'unsafe-eval'");
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scripts,
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ...(sb ? [`https://${sb}`] : [])],
    "media-src": ["'self'", "blob:", ...(sb ? [`https://${sb}`] : [])],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      ...(sb ? [`https://${sb}`, `wss://${sb}`] : []),
      ...(isDev ? ["ws:", "http:"] : []),
    ],
    "worker-src": ["'self'", "blob:"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
  };
  const parts = Object.entries(directives).map(
    ([k, v]) => `${k} ${v.join(" ")}`,
  );
  if (!isDev) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

const baseHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // "*.dev.tsx" pages (the local playground at /dev) exist only in development.
  pageExtensions: isDev
    ? ["tsx", "ts", "jsx", "js", "dev.tsx"]
    : ["tsx", "ts", "jsx", "js"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [
          ...baseHeaders,
          { key: "Content-Security-Policy", value: csp({ admin: true }) },
        ],
      },
      {
        // everything except /admin
        source: "/((?!admin).*)",
        headers: [
          ...baseHeaders,
          { key: "Content-Security-Policy", value: csp({ admin: false }) },
        ],
      },
    ];
  },
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
