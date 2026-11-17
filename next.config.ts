import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Local-only database (PGlite): loaded with a dynamic import when there is
  // no DATABASE_URL and not on Vercel. Never bundled; kept out of server traces.
  serverExternalPackages: ["@electric-sql/pglite"],
  outputFileTracingExcludes: {
    "/**": ["./node_modules/@electric-sql/pglite/**/*", "./.data/**/*"],
  },
  // Prompts and source documents are read from disk at request time, so the
  // API route's serverless bundle on Vercel must include them.
  outputFileTracingIncludes: {
    "/api/answer": ["./prompts/**/*", "./sources/**/*"],
    "/admin": ["./sources/**/*"],
    "/admin/sources/[id]": ["./sources/**/*"],
    "/api/admin/verify": ["./sources/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
