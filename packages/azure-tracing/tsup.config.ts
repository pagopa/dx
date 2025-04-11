import { defineConfig } from "tsup";

export default defineConfig({
  bundle: true,
  clean: true,
  dts: true,
  entry: [
    "src",
    "!src/azure/monitor/start-from-env.ts",
    "!src/azure/monitor/env.ts",
    "!src/azure/opentelemetry/azure-undici-instrumentation.ts",
  ],
  format: ["esm"],
  platform: "node",
  sourcemap: true,
  splitting: false,
  tsconfig: "./tsconfig.json",
});
