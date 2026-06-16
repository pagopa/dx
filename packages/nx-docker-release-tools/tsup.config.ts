import { defineConfig } from "tsup";

export default defineConfig({
  banner: {
    js: "#!/usr/bin/env node",
  },
  bundle: true,
  clean: true,
  dts: true,
  entry: ["src/publish-with-latest.ts"],
  format: ["esm"],
  noExternal: ["zod"],
  outDir: "dist",
  platform: "node",
  sourcemap: false,
  splitting: false,
  target: "node22",
  treeshake: true,
  tsconfig: "./tsconfig.json",
});
