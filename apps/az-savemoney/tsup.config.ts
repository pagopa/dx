import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true, // Generate declaration file (.d.ts)
  entry: ["src/index.ts"],
  format: ["esm"], // Generate ESM (.js) files
  sourcemap: true,
  splitting: false,
});
