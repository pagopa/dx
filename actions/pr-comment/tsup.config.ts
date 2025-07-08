import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  dts: false,
  sourcemap: false,
  clean: true,
  minify: true,
  target: "node20",
  bundle: true,
  platform: "node",
  noExternal: [/.*/],
  treeshake: true
});
