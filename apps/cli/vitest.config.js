/// <reference types="vitest" />
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "src/characterization/**/*.test.ts"],
    server: {
      deps: {
        inline: ["replace-in-file"],
      },
    },
    watch: false,
  },
});
