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
      exclude: ["dist", "node_modules", "**/*.config.ts", "scripts"],
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
    environment: "node",
    globals: true,
  },
});
