import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  dts: false,
  sourcemap: true,
  clean: true,
  minify: true,
  target: "node20",
  bundle: true,
  platform: "node",
  external: [],
});
