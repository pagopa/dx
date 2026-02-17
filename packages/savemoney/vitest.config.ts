import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.config.*",
        "**/*.test.*",
        "**/types.ts",
      ],
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
    environment: "node",
    exclude: ["node_modules/", "dist/"],
    globals: true,
    include: ["src/**/*.test.ts"],
    watch: false,
  },
});
