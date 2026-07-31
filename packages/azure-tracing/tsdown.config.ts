import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  dts: true,
  entry: {
    "functions/hooks": "src/azure/functions/hooks.ts",
    "functions/index": "src/azure/functions/index.mts",
    "functions/v3/index": "src/azure/functions/v3/index.ts",
    "monitor/index": "src/azure/monitor/index.ts",
    "opentelemetry/logger": "src/azure/opentelemetry/logger.ts",
  },
  fixedExtension: false,
  format: ["esm", "cjs"],
  outDir: "dist",
  platform: "node",
  sourcemap: true,
});
