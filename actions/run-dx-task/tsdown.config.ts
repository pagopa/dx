import { defineConfig } from "tsdown";

export default defineConfig({
  deps: {
    onlyBundle: false,
  },
  dts: false,
  entry: "src/index.ts",
  minify: true,
  nodeProtocol: true,
  outDir: "dist",
  platform: "node",
});
