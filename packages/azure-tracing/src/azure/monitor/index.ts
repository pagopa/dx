import {
  AzureMonitorOpenTelemetryOptions,
  useAzureMonitor,
} from "@azure/monitor-opentelemetry";
import { metrics, trace } from "@opentelemetry/api";
import {
  Instrumentation,
  registerInstrumentations,
} from "@opentelemetry/instrumentation";

import { registerUndiciInstrumentation } from "../opentelemetry/azure-undici-instrumentation";
import { initFromEnv } from "./start-from-env";

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
 * - If `azureMonitorOptions` is not provided, the configuration will be initialized
 *   using environment variables. @see README for more details.
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
 * // Usage with custom Azure Monitor options
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
 * @param azureMonitorOptions - Custom configuration for Azure Monitor. If not provided,
 *   it will be initialized using environment variables.
 */
export const initAzureMonitor = (
  instrumentations: readonly Instrumentation[] = [],
  azureMonitorOptions?: AzureMonitorOpenTelemetryOptions,
) => {
  if (azureMonitorOptions) {
    useAzureMonitor(azureMonitorOptions);
  } else {
    initFromEnv();
  }

  registerInstrumentations({
    instrumentations: [registerUndiciInstrumentation(), ...instrumentations],
    meterProvider: metrics.getMeterProvider(),
    tracerProvider: trace.getTracerProvider(),
  });
};
