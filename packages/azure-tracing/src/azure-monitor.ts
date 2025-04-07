import { useAzureMonitor } from "@azure/monitor-opentelemetry";
import { metrics, trace } from "@opentelemetry/api";
import {
  Instrumentation,
  registerInstrumentations,
} from "@opentelemetry/instrumentation";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";

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
      new UndiciInstrumentation({
        requestHook: (span, requestInfo) => {
          const { method, origin, path } = requestInfo;
          // Default instrumented attributes don't feed well into AppInsights,
          // so we set them manually.
          span.setAttributes({
            "http.host": origin,
            "http.method": method,
            "http.target": path,
            "http.url": `${origin}${path}`,
          });
        },
        responseHook: (span, { response }) => {
          // Same as above, set the status code manually.
          span.setAttribute("http.status_code", response.statusCode);
        },
      }),
      ...instrumentations,
    ],
    meterProvider: metrics.getMeterProvider(),
    tracerProvider: trace.getTracerProvider(),
  });
};
