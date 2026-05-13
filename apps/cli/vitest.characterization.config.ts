import { configDefaults, defineConfig } from "vitest/config";

import baseConfig from "./vitest.config.js";

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    exclude: [...configDefaults.exclude],
    include: ["src/characterization/**/*.test.ts"],
    testTimeout: 300_000,
    watch: false,
  },
});
