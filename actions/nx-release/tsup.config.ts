import { defineConfig } from "tsup";

export default defineConfig({
  bundle: true,
  clean: true,
  dts: false,
  entry: ["scripts/nx-release-version.ts", "scripts/nx-release-publish.ts"],
  format: ["esm"],
  minify: false,
  outDir: "scripts/dist",
  platform: "node",
  sourcemap: false,
  splitting: false,
  target: "node20",
  treeshake: true,
});
