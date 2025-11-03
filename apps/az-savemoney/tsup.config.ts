import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true, // Generate declaration file (.d.ts)
  entry: ["src/index.ts"],
  format: ["cjs", "esm"], // Build for commonJS and ESmodules
  sourcemap: true,
  splitting: false,
});
