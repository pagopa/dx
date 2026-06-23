/**
 * OTel preload module for the dx CLI.
 *
 * This module is a deliberate side-effect entrypoint. It MUST be the first
 * module loaded by the process (via a sequential dynamic import in bin/index.js)
 * so that import-in-the-middle can register its hook before any HTTP client
 * libraries (undici/fetch, octokit, Azure SDKs) are loaded.
 *
 * Initialising the Azure Monitor exporter is deferred to `enableAzureMonitor()`
 * so the CLI can decide at runtime whether to emit telemetry (only PagoPA org
 * members do). The import-in-the-middle hook is still registered eagerly at
 * preload because it must run before any instrumented module is imported.
 *
 * Reads APPLICATIONINSIGHTS_CONNECTION_STRING from process.env because this IS
 * the configuration boundary — no higher caller can inject config at this point
 * in the process lifecycle.
 */

import { useAzureMonitor } from "@azure/monitor-opentelemetry";
import { metrics, trace } from "@opentelemetry/api";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
// import-in-the-middle and module must be the first imports so that
// createAddHookMessageChannel / register run as early as possible.
import { createAddHookMessageChannel } from "import-in-the-middle";
import { register } from "module";
import os from "node:os";

const { registerOptions, waitForAllMessagesAcknowledged } =
  createAddHookMessageChannel();

// Register the ESM module hook so that subsequent dynamic imports are
// intercepted by OpenTelemetry's module instrumentation.
register("import-in-the-middle/hook.mjs", import.meta.url, registerOptions);

// Set service name before useAzureMonitor() initialises the Resource so
// that Azure Monitor picks it up as the cloud_RoleName.
process.env["OTEL_SERVICE_NAME"] = "cli";
process.env["OTEL_RESOURCE_ATTRIBUTES"] = [
  process.env["OTEL_RESOURCE_ATTRIBUTES"],
  "service.namespace=dx",
]
  .filter(Boolean)
  .join(",");

// os.platform() returns "win32" on Windows; the OTel os.type enum uses "windows".
const osPlatform = os.platform();
const osType = osPlatform === "win32" ? "windows" : osPlatform;
process.env["OTEL_RESOURCE_ATTRIBUTES"] = [
  process.env["OTEL_RESOURCE_ATTRIBUTES"],
  `os.type=${osType}`,
  `os.version=${os.release()}`,
  `os.machine=${os.machine()}`,
]
  .filter(Boolean)
  .join(",");

let azureMonitorEnabled = false;

/**
 * Initialises the Azure Monitor exporter and registers HTTP instrumentation.
 *
 * Deferred (not run at preload) so the CLI only emits telemetry once it has
 * confirmed the user is a PagoPA org member. Idempotent: safe to call more than
 * once. Must be called before logging is configured so the logtape OTel sink
 * binds to the real (rather than no-op) LoggerProvider.
 */
export const enableAzureMonitor = (): void => {
  if (azureMonitorEnabled) {
    return;
  }
  azureMonitorEnabled = true;

  useAzureMonitor({
    azureMonitorExporterOptions: {
      connectionString:
        process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ||
        "InstrumentationKey=e0ff8094-78fa-45e5-a21d-e62b453dc5d1;IngestionEndpoint=https://italynorth-0.in.applicationinsights.azure.com/;LiveEndpoint=https://italynorth.livediagnostics.monitor.azure.com/;ApplicationId=ce469d55-2ff7-4dfd-a249-cc787291e672",
    },
    enableLiveMetrics: true,
  });

  // Registered after useAzureMonitor() so the instrumentation binds to the
  // real tracer/meter providers it installs (rather than the no-op defaults).
  registerInstrumentations({
    instrumentations: [new UndiciInstrumentation()],
    meterProvider: metrics.getMeterProvider(),
    tracerProvider: trace.getTracerProvider(),
  });
};

// Block module evaluation until the hook is fully acknowledged.
// This ensures that when bin/index.js proceeds to import the CLI entry
// module, all transitive imports go through the registered hook.
await waitForAllMessagesAcknowledged();
