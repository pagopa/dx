import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  define: {
    __CLI_VERSION__: `"${process.env.npm_package_version || "0.0.0"}"`,
  },
  dts: false,
  entry: ["src/cli/index.ts"],
  format: ["esm"],
  loader: {
    ".ini": "text",
    ".kusto": "text",
    ".sh": "text",
    ".tf": "text",
    ".tfvars": "text",
  },
  outDir: "dist",
  sourcemap: true,
  splitting: false,
});
