/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The skill tests spawn scripts from the skill folder, which takes seconds
    // on CI runners.
    include: ["skills/**/src/**/*.test.ts", "skills/**/scripts/*.test.js"],
    testTimeout: 30_000,
    watch: false,
  },
});
