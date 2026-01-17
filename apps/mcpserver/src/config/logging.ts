/**
 * LogTape logging configuration for the MCP server.
 *
 * Configures logging for both the mcpserver and mcp-prompts packages.
 * The console sink works perfectly in all environments:
 * - AWS Lambda: stdout → CloudWatch
 * - Local: stdout → console
 *
 * Log level is controlled via the LOG_LEVEL environment variable.
 *
 * Usage:
 * Instead of importing a global logger, use getLogger directly in each module:
 *
 * import { getLogger } from "@logtape/logtape";
 * const logger = getLogger(["mcpserver", "module-name"]);
 * logger.info("Message");
 */

import { configure, getConsoleSink, type LogLevel } from "@logtape/logtape";
import * as z from "zod";

/**
 * Zod schema for validating log levels.
 * Based on LogTape's LogLevel type.
 */
const DEFAULT_LOG_LEVEL: LogLevel = "info";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const logLevelSchema = z
  .enum(["error", "trace", "debug", "info", "warning", "fatal"])
  .catch(DEFAULT_LOG_LEVEL);

type LogLevelEnv = z.infer<typeof logLevelSchema>;

export async function configureLogging(logLevelEnv: LogLevelEnv) {
  await configure({
    loggers: [
      {
        category: ["mcpserver"],
        lowestLevel: logLevelEnv,
        sinks: ["console"],
      },
      {
        category: ["mcp-prompts"],
        lowestLevel: logLevelEnv,
        sinks: ["console"],
      },
      {
        category: ["logtape", "meta"],
        lowestLevel: "warning",
        sinks: ["console"],
      },
    ],
    sinks: {
      console: getConsoleSink(),
    },
  });
}
