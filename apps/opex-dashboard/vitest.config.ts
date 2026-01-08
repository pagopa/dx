import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    coverage: {
      exclude: [
        "dist",
        "bin",
        "node_modules",
        "test",
        "**/*.config.ts",
        "scripts",
      ],
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        autoUpdate: false,
        branches: 60,
        functions: 80,
        lines: 80,
        perFile: false,
        statements: 80,
      },
    },
    environment: "node",
    globals: true,
    setupFiles: ["./test/setup.ts"],
  },
});
