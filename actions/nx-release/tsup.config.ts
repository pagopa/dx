import { defineConfig } from "tsup";

export default defineConfig({
  bundle: true,
  clean: true,
  dts: false,
  entry: [
    "scripts/build-pr-body.ts",
    "scripts/extract-tags.ts",
    "scripts/sync-tags-releases.ts",
  ],
  format: ["esm"],
  minify: false,
  outDir: "scripts/dist",
  platform: "node",
  sourcemap: false,
  splitting: false,
  target: "node20",
  treeshake: true,
});
