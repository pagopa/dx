import { DefaultAzureCredential } from "@azure/identity";
import { useAzureMonitor } from "@azure/monitor-opentelemetry";

import { loadEnv } from "./env";

export const initFromEnv = () => {
  const env = loadEnv();

  return useAzureMonitor({
    azureMonitorExporterOptions: {
      connectionString: env.APPLICATIONINSIGHTS_CONNECTION_STRING,
      // When managed identity is enabled, DefaultAzureCredential handles
      // authentication instead of the shared key embedded in the connection string.
      ...(env.APPLICATIONINSIGHTS_USE_MANAGED_IDENTITY && {
        credential: new DefaultAzureCredential(),
      }),
    },
    enableLiveMetrics: true,
    samplingRatio: env.APPINSIGHTS_SAMPLING_PERCENTAGE,
    // Disable rate limiter introduced in @azure/monitor-opentelemetry@1.16.0
    // (default: 5 req/s). A value of 0 means no limit.
    tracesPerSecond: 0,
  });
};
