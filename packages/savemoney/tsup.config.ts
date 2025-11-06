import { defineConfig } from "tsup";

export default defineConfig({
  banner: {
    js: "#!/usr/bin/env node",
  },
  clean: true,
  dts: false,
  entry: ["src/cli.ts"],
  format: ["esm"],
  outDir: "bin",
  target: "esnext",
  tsconfig: "./tsconfig.json",
});
