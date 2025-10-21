/**
 * LogTape logger instance for the mcp-prompts package.
 *
 * LogTape is a pluggable logging framework that allows consumers
 * to configure logging behavior according to their needs.
 *
 * Consumers can configure logging using LogTape's configure() function:
 *
 * @example
 * ```typescript
 * import { configure, getConsoleSink } from "@logtape/logtape";
 *
 * await configure({
 *   loggers: [
 *     { category: ["mcp-prompts"], lowestLevel: "debug", sinks: ["console"] }
 *   ],
 *   sinks: {
 *     console: getConsoleSink()
 *   }
 * });
 * ```
 *
 * @see https://logtape.org/
 */

import { getLogger } from "@logtape/logtape";

export const logger = getLogger(["mcp-prompts"]);
