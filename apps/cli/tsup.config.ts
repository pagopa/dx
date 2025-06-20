import { defineConfig } from "tsup";

import pkg from "./package.json" assert { type: "json" };

export default defineConfig({
  banner: {
    js: "#!/usr/bin/env node",
  },
  clean: true,
  define: {
    __CLI_VERSION__: JSON.stringify(pkg.version),
  },
  dts: false,
  entry: ["src/index.ts"],
  format: ["esm"],
  outDir: "bin",
  target: "esnext",
  tsconfig: "./tsconfig.json",
});
