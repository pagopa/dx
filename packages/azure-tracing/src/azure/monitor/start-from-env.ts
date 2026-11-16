/**
 * Initializes Azure Monitor from the environment only.
 *
 * Used where there is no call site to pass options to, such as the
 * `NODE_OPTIONS` preload that instruments Azure Functions.
 */
import { useAzureMonitor } from "@azure/monitor-opentelemetry";

import { loadEnv } from "./env.js";
import { resolveAzureMonitorOptions } from "./options.js";

export const initFromEnv = () =>
  useAzureMonitor(resolveAzureMonitorOptions(loadEnv()));
