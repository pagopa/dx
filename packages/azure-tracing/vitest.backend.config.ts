/**
 * Shared Vitest entrypoint for slower backend suites that reuse one local topology.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    globalSetup: "./tests/global-setup.ts",
    hookTimeout: 120_000,
    include: ["tests/**/*.test.ts"],
    testTimeout: 120_000,
    watch: false,
  },
});
