import { defineConfig } from "oxfmt";

export default defineConfig({
  ignorePatterns: [
    "*.hbs",
    "CHANGELOG.md",
    "pnpm-*.yaml",
    "tfmodules.lock.json",
    ".nx/",
    ".mise/",
    "dist/",
  ],
  printWidth: 80,
});
