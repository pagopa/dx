import { defineConfig } from "oxfmt";

export default defineConfig({
  ignorePatterns: ["CHANGELOG.md", "pnpm-*.yaml", "tfmodules.lock.json", ".nx/", ".mise/", "dist/"],
});
