#!/usr/bin/env node

// The instrumentation module must be loaded first so that the OpenTelemetry
// module hook (import-in-the-middle) is registered before any of the CLI's
// modules are imported. Static imports are always hoisted before code runs, so
// sequential dynamic imports are the only way to guarantee this load order.
await import("../dist/adapters/azure-monitor/instrumentation.js");

const { runCli } = await import("../dist/index.js");
const { default: packageJson } = await import("../package.json", {
  with: { type: "json" },
});

await runCli(packageJson.version).catch((error) =>
  console.error(error.message),
);
