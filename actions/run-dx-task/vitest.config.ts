/** Configures focused unit tests for the run-dx-task action. */

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    watch: false,
  },
});
