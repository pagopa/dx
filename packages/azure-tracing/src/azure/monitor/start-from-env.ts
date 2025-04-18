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
  });
};
