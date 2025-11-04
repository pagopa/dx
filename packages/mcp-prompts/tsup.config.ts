import { defineConfig } from "tsup";

export default defineConfig({
  bundle: true,
  clean: true,
  dts: true,
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  platform: "node",
  shims: true, // Enable shims for import.meta.url in CommonJS
  sourcemap: true,
  splitting: false,
  tsconfig: "./tsconfig.json",
});
