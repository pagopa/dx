import { createAddHookMessageChannel } from "import-in-the-middle";
import { register } from "module";

const { registerOptions, waitForAllMessagesAcknowledged } =
  createAddHookMessageChannel();

register("import-in-the-middle/hook.mjs", import.meta.url, registerOptions);

import { useAzureMonitor } from "@azure/monitor-opentelemetry";
import { metrics, trace } from "@opentelemetry/api";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// Load and type check environment variables on runtime
const env = createEnv({
  emptyStringAsUndefined: true,
  onValidationError: (errors) => {
    throw new Error(
      errors.map((error) => `${error.path} - ${error.message}`).join(", "),
    );
  },
  runtimeEnv: process.env,
  server: {
    AI_CONNECTION_STRING: z
      .string()
      .describe("The connection string for Application Insights."),
    AI_SAMPLING_PERCENTAGE: z
      .optional(
        z.coerce
          .number()
          .min(0)
          .max(100)
          .default(5)
          .describe(
            "Application Insights sampling percentage between 0 and 100. If not set, defaults to 5.",
          ),
      )
      .transform((value) => {
        const percentage = Number(value);
        return isNaN(percentage) ? 5 : percentage;
      })
      .transform((value) => value / 100),
  },
});

useAzureMonitor({
  azureMonitorExporterOptions: {
    connectionString: env.AI_CONNECTION_STRING,
  },
  enableLiveMetrics: true,
  samplingRatio: env.AI_SAMPLING_PERCENTAGE,
});

registerInstrumentations({
  instrumentations: [new UndiciInstrumentation()],
  meterProvider: metrics.getMeterProvider(),
  tracerProvider: trace.getTracerProvider(),
});

await waitForAllMessagesAcknowledged();
