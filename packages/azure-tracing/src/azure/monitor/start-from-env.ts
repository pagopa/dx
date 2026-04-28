import { DefaultAzureCredential } from "@azure/identity";
import {
  type AzureMonitorOpenTelemetryOptions,
  useAzureMonitor,
} from "@azure/monitor-opentelemetry";

import { loadEnv } from "./env.js";

export const initFromEnv = () => {
  const env = loadEnv();

  const azureMonitorOptions: AzureMonitorOpenTelemetryOptions = {
    azureMonitorExporterOptions: {
      connectionString: env.APPLICATIONINSIGHTS_CONNECTION_STRING,
      ...(env.APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED
        ? {
            // Entra ID (Managed Identity) authentication via DefaultAzureCredential.
            // DefaultAzureCredential tries multiple credential providers in order:
            // Managed Identity in production, Azure CLI / service principal for local dev.
            credential: new DefaultAzureCredential(),
          }
        : {}),
    },
    enableLiveMetrics: true,
    samplingRatio: env.APPINSIGHTS_SAMPLING_PERCENTAGE,
    // Disable rate limiter introduced in @azure/monitor-opentelemetry@1.16.0
    // (default: 5 req/s). A value of 0 means no limit.
    tracesPerSecond: 0,
  };

  return useAzureMonitor(azureMonitorOptions);
};
