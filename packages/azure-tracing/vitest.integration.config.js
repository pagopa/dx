/// <reference types="vitest" />
/**
 * Vitest configuration for opt-in integration suites that exercise real
 * dependencies through local containers.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The packed tarball is built once per run and shared with every suite.
    globalSetup: ["./src/__tests__/packed-package.global-setup.ts"],
    include: ["src/**/*.integration.test.ts"],
    watch: false,
  },
});
