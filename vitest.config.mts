import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Tests never open the local .data/pglite database or a real DATABASE_URL:
    // a test that needs a database injects in-memory PGlite with setDbForTests.
    env: { VERCEL: "1", DATABASE_URL: "" },
    // PGlite start-up and scrypt are slow when test files run in parallel.
    testTimeout: 30_000,
  },
});
