import { defineConfig } from "tsdown";

export default defineConfig({
  dts: false,
  entry: {
    "executors/plan-upload/plan-upload":
      "src/executors/plan-upload/plan-upload.ts",
    "executors/plan/plan": "src/executors/plan/plan.ts",
    "executors/publish/publish": "src/executors/publish/publish.ts",
    "executors/release-apply/release-apply":
      "src/executors/release-apply/release-apply.ts",
    index: "src/index.ts",
    "release/version-actions": "src/release/version-actions.ts",
  },
  fixedExtension: false,
  minify: false,
  nodeProtocol: true,
  outDir: "dist",
  platform: "node",
});
