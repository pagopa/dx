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
    "scripts/summarize-version-plan-pr.ts",
    "scripts/sync-tags-releases.ts",
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
