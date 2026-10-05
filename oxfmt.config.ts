import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 80,
  ignorePatterns: [
    "pnpm-*.yaml",
    "CHANGELOG.md",
    ".nx/",
    "dist/",
    "*.hbs",
    "apps/opex-dashboard/test/data/io_backend_malformed.yaml",
    "infra/modules/**/README.md",
  ],
});
