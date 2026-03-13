import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        "node_modules/",
        "scripts/dist/",
        "**/*.config.*",
        "**/*.test.ts",
      ],
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
    environment: "node",
    exclude: ["node_modules/", "scripts/dist/"],
    globals: true,
    include: ["scripts/**/*.test.ts"],
    watch: false,
  },
});
