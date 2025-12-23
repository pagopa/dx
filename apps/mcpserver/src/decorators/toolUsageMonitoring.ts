/**
 * Tool Usage Monitoring Decorator
 *
 * This module provides a decorator function for wrapping tool executors with
 * automatic telemetry, logging, and performance monitoring.
 *
 * Features:
 * - Execution time tracking
 * - Success/failure logging
 * - Azure Application Insights integration
 * - CloudWatch logging (in Lambda)
 * - Error handling and propagation
 *
 * The decorator wraps tool handlers transparently, maintaining the same
 * function signature while adding observability.
 *
 * @module decorators/toolUsageMonitoring
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { getLogger } from "@logtape/logtape";
import { emitCustomEvent } from "@pagopa/azure-tracing/logger";

const logger = getLogger(["mcpserver", "tool-logging"]);

/**
 * Tool execution handler type
 *
 * @template TArgs - Type of the tool's input arguments
 * @param args - Input arguments for the tool
 * @param sessionData - Optional session data (e.g., auth info)
 * @returns Promise resolving to CallToolResult
 */
export type ToolExecutor<TArgs = Record<string, unknown>> = (
  args: TArgs,
  sessionData?: Record<string, unknown>,
) => Promise<CallToolResult>;

/**
 * Wraps a tool executor with telemetry and logging
 *
 * This decorator function adds observability to tool execution by:
 * 1. Logging tool invocation with arguments
 * 2. Tracking execution time
 * 3. Emitting custom events to Azure Application Insights
 * 4. Logging success or failure
 * 5. Preserving original error behavior
 *
 * The decorator is transparent - it maintains the same function signature
 * and behavior while adding monitoring capabilities.
 *
 * @template TArgs - Type of the tool's input arguments
 * @param toolName - Name of the tool being wrapped (for logging)
 * @param executor - The original tool execution function
 * @returns Wrapped executor with telemetry
 *
 * @example
 * ```typescript
 * const handler = withToolLogging(
 *   'MyTool',
 *   async (args) => {
 *     // Tool logic here
 *     return { content: [{ type: 'text', text: 'Result' }] };
 *   }
 * );
 * ```
 */
export function withToolLogging<TArgs = Record<string, unknown>>(
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

    // Log to console (CloudWatch in Lambda, stdout in local dev)
    logger.debug(`Tool executed: ${toolName} - ${JSON.stringify(eventData)}`);

    // Emit custom event to Azure Application Insights for centralized monitoring
    emitCustomEvent("ToolExecuted", eventData)("mcpserver");

    try {
      // Execute the original tool handler
      const result = await executor(args, sessionData);

      const executionTime = Date.now() - startTime;

      // Log successful completion with execution time
      logger.debug(
        `Tool completed: ${toolName} - execution time: ${executionTime}ms`,
      );

      // Emit completion event for analytics and monitoring
      emitCustomEvent("ToolCompleted", {
        executionTimeMs: executionTime.toString(),
        toolName,
      })("mcpserver");

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Log error details for troubleshooting
      logger.error(
        `Tool failed: ${toolName} - ${error instanceof Error ? error.message : String(error)} - execution time: ${executionTime}ms`,
      );

      // Emit failure event with error details
      emitCustomEvent("ToolFailed", {
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: executionTime.toString(),
        toolName,
      })("mcpserver");

      throw error;
    }
  };
}
