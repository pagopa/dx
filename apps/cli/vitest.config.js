/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    server: {
      deps: {
        inline: ["replace-in-file"],
      },
    },
    // CI runs this suite next to Docker builds and other Nx tasks on shared
    // runners, where filesystem-heavy tests can stall past the 5s default.
    testTimeout: 30_000,
    watch: false,
  },
});
