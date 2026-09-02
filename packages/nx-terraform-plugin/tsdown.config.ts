import { defineConfig } from "tsdown";

export default defineConfig({
  deps: {
    // @pagopa/dx-tasks is a workspace-only devDependency: it must be inlined
    // because it is not installable as a runtime dependency of this plugin.
    alwaysBundle: [/^@pagopa\/dx-tasks(\/|$)/],
    neverBundle: true,
  },
  dts: false,
  entry: {
    "executors/init/init": "src/executors/init/init.ts",
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
