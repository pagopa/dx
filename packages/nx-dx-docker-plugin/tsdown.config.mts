import { defineConfig } from "tsdown";

// Output format is deliberately CommonJS (unlike this repo's other,
// ESM-built plugins). Nx's plugin loader `require()`s the resolved entry
// point then mutates it with `plugin.name ??= name`; a native ES module's
// namespace object is frozen, so it fails with "Cannot add property name,
// object is not extensible" (confirmed reproducible against
// selfcare-monorepo-poc's Nx 22.6.5, not reproducible against this repo's
// own Nx 22.7.5 — Nx-version dependent, don't assume one repo passing
// proves the other is safe). A plain CJS `module.exports` object doesn't
// have this problem.
export default defineConfig({
  deps: {
    skipNodeModulesBundle: true,
  },
  dts: false,
  entry: {
    "docker-prebuild": "src/docker-prebuild.ts",
    "executors/docker-build/docker-build":
      "src/executors/docker-build/docker-build.ts",
    "executors/docker-push/docker-push":
      "src/executors/docker-push/docker-push.ts",
    "executors/release-publish/release-publish":
      "src/executors/release-publish/release-publish.ts",
    "generators/init/generator": "src/generators/init/generator.ts",
    index: "src/index.ts",
    "release/version-actions": "src/release/version-actions.ts",
  },
  fixedExtension: false,
  format: "cjs",
  minify: false,
  nodeProtocol: true,
  outDir: "dist",
  platform: "node",
});
