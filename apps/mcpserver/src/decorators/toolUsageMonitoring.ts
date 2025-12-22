import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { getLogger } from "@logtape/logtape";
import { emitCustomEvent } from "@pagopa/azure-tracing/logger";

const logger = getLogger(["mcpserver", "tool-logging"]);

/**
 * Tool execution handler type
 */
export type ToolExecutor<TArgs = unknown> = (
  args: TArgs,
  sessionData?: unknown,
) => Promise<CallToolResult>;

/**
 * Wraps a tool executor with telemetry and logging
 */
export function withToolLogging<TArgs = unknown>(
  toolName: string,
  executor: ToolExecutor<TArgs>,
): ToolExecutor<TArgs> {
  return async (args, sessionData) => {
    const startTime = Date.now();
    const eventData = {
      arguments: JSON.stringify(args),
      timestamp: new Date().toISOString(),
      toolName,
    };

    // Log to console (goes to CloudWatch in Lambda)
    logger.debug(`Tool executed: ${toolName} - ${JSON.stringify(eventData)}`);

    // Emit custom event to Azure Application Insights
    emitCustomEvent("ToolExecuted", eventData)("mcpserver");

    try {
      // Call the original executor function and return the result
      const result = await executor(args, sessionData);

      const executionTime = Date.now() - startTime;

      // Log successful completion
      logger.debug(
        `Tool completed: ${toolName} - execution time: ${executionTime}ms`,
      );

      // Emit completion event to Azure Application Insights
      emitCustomEvent("ToolCompleted", {
        executionTimeMs: executionTime.toString(),
        toolName,
      })("mcpserver");

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Log error
      logger.error(
        `Tool failed: ${toolName} - ${error instanceof Error ? error.message : String(error)} - execution time: ${executionTime}ms`,
      );

      // Emit error event to Azure Application Insights
      emitCustomEvent("ToolFailed", {
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: executionTime.toString(),
        toolName,
      })("mcpserver");

      throw error;
    }
  };
}
