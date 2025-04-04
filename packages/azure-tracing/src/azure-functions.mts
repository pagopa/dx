import { createAddHookMessageChannel } from "import-in-the-middle";
import { register } from "module";

const { registerOptions, waitForAllMessagesAcknowledged } =
  createAddHookMessageChannel();

register("import-in-the-middle/hook.mjs", import.meta.url, registerOptions);

import { app } from "@azure/functions";
import { useAzureMonitor } from "@azure/monitor-opentelemetry";
import {
  metrics,
  context as otelContext,
  propagation,
  trace,
} from "@opentelemetry/api";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";

useAzureMonitor();

registerInstrumentations({
  instrumentations: [new UndiciInstrumentation()],
  meterProvider: metrics.getMeterProvider(),
  tracerProvider: trace.getTracerProvider(),
});

await waitForAllMessagesAcknowledged();

app.hook.preInvocation((context) => {
  const traceContext = context.invocationContext.traceContext;
  if (traceContext) {
    context.functionHandler = otelContext.bind(
      propagation.extract(otelContext.active(), {
        traceparent: traceContext.traceParent,
        tracestate: traceContext.traceState,
      }),
      context.functionHandler,
    );
  }
});
