import { defineConfig } from "tsup";

export default defineConfig({
  banner: {
    js: "#!/usr/bin/env node",
  },
  clean: true,
  define: {
    __CLI_VERSION__: `"${process.env.npm_package_version || "0.0.0"}"`,
  },
  dts: false,
  entry: ["src/index.ts"],
  format: ["esm"],
  outDir: "bin",
  target: "esnext",
  tsconfig: "./tsconfig.json",
});
