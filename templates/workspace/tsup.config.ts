import { defineConfig } from "tsup";

export default defineConfig({
  bundle: true,
  clean: true,
  dts: true,
  entry: [
    "src",
  ],
  format: ["esm", "cjs"],
  platform: "node",
  sourcemap: true,
  splitting: false,
  tsconfig: "./tsconfig.json",
});
