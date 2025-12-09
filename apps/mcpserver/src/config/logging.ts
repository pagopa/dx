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
import { z } from "zod";

/**
 * Zod schema for validating log levels.
 * Based on LogTape's LogLevel type.
 */
const DEFAULT_LOG_LEVEL: LogLevel = "info";

const logLevelSchema = z
  .enum(["debug", "info", "warning", "error"])
  .catch(DEFAULT_LOG_LEVEL);

export async function configureLogging() {
  const logLevel = logLevelSchema.parse(process.env.LOG_LEVEL) as LogLevel;
  if (logLevel !== process.env.LOG_LEVEL) {
    // Use console.warn for this early logging before LogTape is configured
    console.warn(
      `Invalid log level: ${process.env.LOG_LEVEL} cause different from ${logLevel}. Using ${DEFAULT_LOG_LEVEL}`,
    );
  }

  await configure({
    loggers: [
      {
        category: ["mcpserver"],
        lowestLevel: logLevel,
        sinks: ["console"],
      },
      {
        category: ["mcp-prompts"],
        lowestLevel: logLevel,
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
