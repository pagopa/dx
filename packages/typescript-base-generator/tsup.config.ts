import { defineConfig } from "tsup";

export default defineConfig({
  bundle: true,
  clean: true,
  dts: true,
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  minify: true,
  platform: "node",
  sourcemap: true,
  target: "node20",
  treeshake: true,
  tsconfig: "./tsconfig.json",
});
