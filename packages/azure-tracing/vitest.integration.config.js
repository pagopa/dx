/// <reference types="vitest" />
/**
 * Vitest configuration for opt-in integration suites that exercise real
 * dependencies through local containers.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.integration.test.ts"],
    watch: false,
  },
});
