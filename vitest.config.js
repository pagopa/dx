import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        // Use default values (like `dist/**`) but make it compatible with the execution from the monorepo root
        ...configDefaults.coverage.exclude.map((path) => `**/${path}`),
        // CLI
        "**/bin/**",
        // Website
        "**/build/**",
      ],
    },
    projects: ["apps/*"]
  },
});
