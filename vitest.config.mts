import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    // tests/db runs the real SQL migrations in an in-process Postgres
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/db/**/*.test.ts"],
    testTimeout: 30_000,
    // Locally, keep to 2 workers so the run fits in 8 GB of RAM.
    maxWorkers: process.env.CI ? undefined : 2,
    setupFiles: ["tests/unit/setup.ts"],
  },
});
