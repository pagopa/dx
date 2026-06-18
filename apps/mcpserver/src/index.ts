/**
 * PagoPA DX Knowledge Retrieval MCP Server
 *
 * This module exposes the main server startup logic without triggering side effects
 * at import time. All runtime setup flows from the main entrypoint.
 */

import * as http from "node:http";

import { loadConfig } from "./config.js";
import { configureLogging } from "./config/logging.js";
import { configureAzureMonitoring } from "./config/monitoring.js";
import { startHttpServer } from "./server.js";

export async function main(
  env: NodeJS.ProcessEnv,
): Promise<http.Server | undefined> {
  const config = loadConfig(env);

  await configureLogging(config.logLevel);
  configureAzureMonitoring(config.monitoring);

  const httpServer = await startHttpServer(config);
  return httpServer;
}

export { startHttpServer };
