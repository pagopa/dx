import { useAzureMonitor } from "@azure/monitor-opentelemetry";
import {
  Instrumentation,
  registerInstrumentations
} from "@opentelemetry/instrumentation";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { metrics, trace } from "@opentelemetry/api";

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
 * import { init } from "@azure/monitor-opentelemetry";
 *
 * init();
 * @param instrumentations the list of instrumentations to register with the Azure Monitor.
 */
export const init = (instrumentations: readonly Instrumentation[]) => {
  useAzureMonitor();

  registerInstrumentations({
    instrumentations: [new UndiciInstrumentation(), ...instrumentations],
    meterProvider: metrics.getMeterProvider(),
    tracerProvider: trace.getTracerProvider(),
  });
}
