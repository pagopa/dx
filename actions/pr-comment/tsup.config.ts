import { defineConfig } from "tsup";

export default defineConfig({
  bundle: true,
  clean: true,
  dts: false,
  entry: ["src/index.ts"],
  format: ["cjs"],
  minify: true,
  noExternal: [/.*/],
  platform: "node",
  sourcemap: false,
  target: "node24",
  treeshake: true,
});
