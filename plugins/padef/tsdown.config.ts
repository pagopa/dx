import { defineConfig } from "tsdown";

export default defineConfig({
  banner: { js: "#!/usr/bin/env node" },
  // The bundle sits beside hand-written scripts, so a clean build would delete
  // them.
  clean: false,
  deps: {
    alwaysBundle: ["pele"],
    // A skill ships this file alone: anything left external would not resolve.
    onlyBundle: ["pele"],
  },
  dts: false,
  entry: { "render-mermaid": "src/cli.ts" },
  minify: true,
  nodeProtocol: true,
  outDir: "skills/confluence-librarian/scripts",
  outExtensions: () => ({ js: ".mjs" }),
  platform: "node",
});
