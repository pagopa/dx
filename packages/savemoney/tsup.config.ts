import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true, // Generate .d.ts files for TypeScript types
  entry: ["src/index.ts"], // Only build the main entry point
  format: ["esm"],
  outDir: "dist",
  target: "esnext",
  tsconfig: "./tsconfig.json",
});
