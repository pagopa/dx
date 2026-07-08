import { defineConfig } from "tsdown";

// Output format is deliberately CommonJS (unlike this repo's other,
// ESM-built plugins) — see the "why CJS" note in the README. Nx's plugin
// loader (`require()`s the resolved entry point) works reliably against a
// CJS `module.exports` object across the range of Nx versions this plugin
// needs to support; a native ES module's frozen namespace object cannot
// have Nx's own `plugin.name` property attached to it, breaking plugin
// loading with "Cannot add property name, object is not extensible" — and
// whether that surfaces depends on Nx-version-specific loader internals
// (confirmed reproducible against selfcare-monorepo-poc's Nx 22.6.5, not
// reproducible in this repo's own Nx 22.7.5).
export default defineConfig({
  deps: {
    skipNodeModulesBundle: true,
  },
  dts: false,
  entry: {
    "docker-prebuild": "src/docker-prebuild.ts",
    index: "src/index.ts",
    "publish-docker-release": "src/publish-docker-release.ts",
    "run-docker": "src/run-docker.ts",
  },
  fixedExtension: false,
  format: "cjs",
  minify: false,
  nodeProtocol: true,
  outDir: "dist",
  platform: "node",
});
