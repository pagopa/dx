import { defineConfig } from "tsup";

export default defineConfig({
  bundle: true,
  clean: true,
  dts: true,
  entry: ["src/**/*.ts", "!src/**/*.test.ts", "!src/__tests__/**"],
  format: ["esm", "cjs"],
  onSuccess: "cp -r src/prompts dist/",
  platform: "node",
  sourcemap: true,
  splitting: false,
  tsconfig: "./tsconfig.json",
});
