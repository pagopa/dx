import { defineConfig } from "tsdown";

export default defineConfig({
  deps: {
    skipNodeModulesBundle: true,
  },
  dts: false,
  entry: {
    "executors/plan/plan": "src/executors/plan/plan.ts",
    "executors/publish/publish": "src/executors/publish/publish.ts",
    index: "src/index.ts",
    "release/version-actions": "src/release/version-actions.ts",
  },
  fixedExtension: false,
  minify: false,
  nodeProtocol: true,
  outDir: "dist",
  platform: "node",
});
