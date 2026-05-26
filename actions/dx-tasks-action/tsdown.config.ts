import { defineConfig } from "tsdown";

export default defineConfig({
  deps: {
    onlyBundle: false,
  },
  dts: false,
  entry: "src/index.ts",
  nodeProtocol: true,
  outDir: "dist",
  platform: "node",
});
