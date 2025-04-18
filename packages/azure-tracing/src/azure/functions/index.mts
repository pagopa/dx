/*
This file is required to instrument ESM application to use OpenTelemetry.
This file must be pre-loaded through the `NODE_OPTIONS` environment variable to
have a fully instrumented application.
 */

import { createAddHookMessageChannel } from "import-in-the-middle";
import { register } from "module";

const { registerOptions, waitForAllMessagesAcknowledged } =
  createAddHookMessageChannel();

register("import-in-the-middle/hook.mjs", import.meta.url, registerOptions);

import { metrics, trace } from "@opentelemetry/api";
import { registerInstrumentations } from "@opentelemetry/instrumentation";

import { initFromEnv } from "../monitor/start-from-env";
import { registerUndiciInstrumentation } from "../opentelemetry/azure-undici-instrumentation";

initFromEnv();

registerInstrumentations({
  instrumentations: [registerUndiciInstrumentation()],
  meterProvider: metrics.getMeterProvider(),
  tracerProvider: trace.getTracerProvider(),
});

await waitForAllMessagesAcknowledged();
