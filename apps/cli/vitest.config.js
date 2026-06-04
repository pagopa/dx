/// <reference types="vitest" />
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["dist/**", ...configDefaults.exclude],
    server: {
      deps: {
        inline: ["replace-in-file"],
      },
    },
    watch: false,
  },
});
