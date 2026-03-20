import { defineConfig } from "tsup";

export default defineConfig({
  bundle: true,
  clean: true,
  dts: false,
  entry: [
    "scripts/extract-tags.ts",
    "scripts/manage-version-pr.ts",
    "scripts/sync-tags-releases.ts",
  ],
  format: ["esm"],
  minify: false,
  noExternal: ["@octokit/rest"],
  outDir: "scripts/dist",
  platform: "node",
  sourcemap: false,
  splitting: false,
  target: "node20",
  treeshake: true,
});
