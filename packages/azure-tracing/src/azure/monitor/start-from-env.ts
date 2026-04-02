import { useAzureMonitor } from "@azure/monitor-opentelemetry";

import { loadEnv } from "./env";

export const initFromEnv = () => {
  const env = loadEnv();

  return useAzureMonitor({
    azureMonitorExporterOptions: {
      connectionString: env.APPLICATIONINSIGHTS_CONNECTION_STRING,
    },
    enableLiveMetrics: true,
    samplingRatio: env.APPINSIGHTS_SAMPLING_PERCENTAGE,
    // Disable rate limiter introduced in @azure/monitor-opentelemetry@1.16.0
    // (default: 5 req/s). A value of 0 means no limit.
    tracesPerSecond: 0,
  });
};
