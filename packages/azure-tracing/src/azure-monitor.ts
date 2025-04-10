import { useAzureMonitor } from "@azure/monitor-opentelemetry";
import { metrics, trace } from "@opentelemetry/api";
import {
  Instrumentation,
  registerInstrumentations,
} from "@opentelemetry/instrumentation";

import { registerUndiciInstrumentation } from "./azure-undici-instrumentation";

/**
 * Initialize the Azure Monitor with the given instrumentations.
 * Call this function to register the instrumentations with the Azure Monitor.
 * By default, the Undici instrumentation is included; if you need to add more,
 * you can pass them as an array of instrumentations.
 *
 * @remarks
 * This function will register the given instrumentations with the Azure Monitor.
 * It is recommended to call this function at the beginning of your application.
 *
 * @example
 * import { initAzureMonitor } from "@pagopa/azure-tracing/azure-monitor";
 *
 * initAzureMonitor();
 * @param instrumentations the list of instrumentations to register with the Azure Monitor.
 */
export const initAzureMonitor = (
  instrumentations: readonly Instrumentation[] = [],
) => {
  useAzureMonitor();

  registerInstrumentations({
    instrumentations: [
      // instrument native node fetch
      registerUndiciInstrumentation(),
      ...instrumentations,
    ],
    meterProvider: metrics.getMeterProvider(),
    tracerProvider: trace.getTracerProvider(),
  });
};
