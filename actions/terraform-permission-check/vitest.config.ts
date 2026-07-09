import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["node_modules/", "dist/", "**/*.config.*", "**/*.test.ts"],
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
    environment: "node",
    exclude: ["node_modules/", "dist/"],
    include: ["src/**/*.test.ts"],
    watch: false,
  },
});
