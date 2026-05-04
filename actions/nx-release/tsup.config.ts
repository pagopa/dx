import { defineConfig } from "tsup";

export default defineConfig({
  bundle: true,
  clean: true,
  dts: false,
  entry: [
    "scripts/extract-projects-to-build.ts",
    "scripts/extract-tags.ts",
    "scripts/manage-version-pr.ts",
    "scripts/shared.ts",
    "scripts/sync-tags-releases.ts",
    "scripts/warn-version-plan-coverage-pr.ts",
  ],
  format: ["esm"],
  minify: false,
  noExternal: ["@octokit/rest", "js-yaml", "zod"],
  outDir: "scripts/dist",
  platform: "node",
  sourcemap: false,
  splitting: false,
  target: "node20",
  treeshake: true,
});
