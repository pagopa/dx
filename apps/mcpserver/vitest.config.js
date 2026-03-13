/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Server startup in http-endpoints.test.ts can exceed the default 10s
    // when coverage instrumentation is enabled in CI
    hookTimeout: 30000,
    watch: false,
  },
});
