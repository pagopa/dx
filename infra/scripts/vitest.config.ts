// Runs repository-owned infrastructure governance checks through Nx.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.ts"],
    name: "pre_commit_scripts",
  },
});
