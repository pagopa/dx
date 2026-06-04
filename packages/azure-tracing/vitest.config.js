/// <reference types="vitest" />
/**
 * Vitest configuration for the default unit-test task.
 *
 * Integration suites are kept opt-in through a dedicated config so Nx `test`
 * remains fast and deterministic in local development and CI.
 */
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "**/*.integration.test.ts"],
    watch: false,
  },
});
