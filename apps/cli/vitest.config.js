/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    server: {
      deps: {
        inline: ["replace-in-file"],
      },
    },
    watch: false,
  },
});
