import { defineConfig } from "tsup";

export default defineConfig({
  bundle: true,
  clean: true,
  dts: true,
  entry: ["src/plopfile.ts"],
  external: ["plop"],
  format: ["esm", "cjs"],
  platform: "node",
  publicDir: "./templates",
  sourcemap: true,
  splitting: false,
  tsconfig: "./tsconfig.json",
});
