/// <reference types="vitest" />
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Server startup in http-endpoints.test.ts can exceed the default 10s
    // when coverage instrumentation is enabled in CI
    exclude: [...configDefaults.exclude, "dist/**"],
    hookTimeout: 30000,
    watch: false,
  },
});
