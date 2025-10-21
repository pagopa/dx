/**
 * LogTape logging configuration for the MCP server.
 *
 * Configures logging for both the mcpserver and mcp-prompts packages.
 * The console sink works perfectly in all environments:
 * - AWS Lambda: stdout → CloudWatch
 * - Local: stdout → console
 *
 * Log level is controlled via the LOG_LEVEL environment variable.
 */

import {
  configure,
  getConsoleSink,
  getLogger,
  type LogLevel,
} from "@logtape/logtape";

/**
 * Logger instance for the MCP server.
 * Use this throughout the mcpserver codebase.
 */
export const logger = getLogger(["mcpserver"]);

export async function configureLogging() {
  const logLevel = (process.env.LOG_LEVEL || "info") as LogLevel;

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
