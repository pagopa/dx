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
const logLevelSchema = z.enum(["debug", "info", "warning", "error"]);

export async function configureLogging() {
  const rawLogLevel = process.env.LOG_LEVEL || "info";
  const parseResult = logLevelSchema.safeParse(rawLogLevel);

  if (!parseResult.success) {
    // Log the error and use a safe default
    console.warn(
      `Invalid LOG_LEVEL "${rawLogLevel}". Must be one of: ${logLevelSchema.options.join(", ")}. Using "info" as default.`,
    );
  }

  const logLevel: LogLevel = parseResult.success ? parseResult.data : "info";

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
