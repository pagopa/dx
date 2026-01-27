/**
 * PagoPA DX Knowledge Retrieval MCP Server
 *
 * This module exposes the main server startup logic without triggering side effects
 * at import time. All runtime setup flows from the main entrypoint.
 */

import { getEnabledPrompts } from "@pagopa/dx-mcpprompts";
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

  const enabledPrompts = await getEnabledPrompts();

  const httpServer = await startHttpServer(config, enabledPrompts);
  return httpServer;
}

export { startHttpServer };
