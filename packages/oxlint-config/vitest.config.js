/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The config tests spawn oxlint, which takes seconds on CI runners.
    testTimeout: 30_000,
    watch: false,
  },
});
