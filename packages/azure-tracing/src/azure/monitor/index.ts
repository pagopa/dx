import { useAzureMonitor } from "@azure/monitor-opentelemetry";
import { metrics, trace } from "@opentelemetry/api";
import {
  type Instrumentation,
  registerInstrumentations,
} from "@opentelemetry/instrumentation";

import { registerUndiciInstrumentation } from "../opentelemetry/azure-undici-instrumentation";
import { loadEnv } from "./env.js";
import {
  type AzureMonitorOptionsOverride,
  resolveAzureMonitorOptions,
} from "./options.js";

export type { AzureMonitorOptionsOverride };

/**
 * Initialize the Azure Monitor with the given instrumentations and options.
 * This function sets up telemetry collection for your application by registering
 * the provided instrumentations and configuring Azure Monitor OpenTelemetry.
 *
 * By default, the Undici instrumentation is included. You can extend the functionality
 * by passing additional instrumentations as an array.
 *
 * @remarks
 * - This function should be called at the start of your application to ensure
 *   telemetry is collected from the beginning.
 * - The configuration is always derived from the environment first; the given
 *   options override only the properties they set, so `{ samplingRatio: 0.5 }`
 *   keeps the environment-derived connection string, live metrics and so on.
 *   @see README for more details.
 *
 * @example
 * // Basic usage with default settings
 * import { initAzureMonitor } from "@pagopa/azure-tracing/azure-monitor";
 * initAzureMonitor();
 *
 * @example
 * // Usage with custom instrumentations
 * import { initAzureMonitor } from "@pagopa/azure-tracing/azure-monitor";
 * import { MyCustomInstrumentation } from "my-custom-instrumentation";
 *
 * initAzureMonitor([new MyCustomInstrumentation()]);
 *
 * @example
 * // Usage with custom Azure Monitor options, merged over the environment defaults
 * import { initAzureMonitor } from "@pagopa/azure-tracing/azure-monitor";
 *
 * initAzureMonitor([], {
 *   azureMonitorExporterOptions: {
 *    connectionString: "theConnectionString",
 *   },
 *   // other options...
 * });
 *
 * @param instrumentations - The list of instrumentations to register with the Azure Monitor.
 * @param overrides - Azure Monitor options overriding the configuration derived
 *   from the environment. Properties that are not set keep the environment value.
 */
export const initAzureMonitor = (
  instrumentations: readonly Instrumentation[] = [],
  overrides: AzureMonitorOptionsOverride = {},
) => {
  useAzureMonitor(resolveAzureMonitorOptions(loadEnv(), overrides));

  registerInstrumentations({
    instrumentations: [registerUndiciInstrumentation(), ...instrumentations],
    meterProvider: metrics.getMeterProvider(),
    tracerProvider: trace.getTracerProvider(),
  });
};
