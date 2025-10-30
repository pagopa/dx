import { getLogger } from "@logtape/logtape";
import { emitCustomEvent } from "@pagopa/azure-tracing/logger";

const logger = getLogger(["mcpserver", "tool-logging"]);

/**
 * Decorator that adds logging to tool execute functions.
 * Logs when a tool is executed to both console and Azure Application Insights.
 * Preserves the exact original function signature and type.
 */
export function withToolLogging<T extends Record<string, unknown>>(tool: T): T {
  if (typeof tool !== "object" || !tool.execute || !tool.name) {
    return tool;
  }

  const originalExecute = tool.execute as (
    ...args: unknown[]
  ) => Promise<unknown>;
  const toolName = tool.name as string;

  return {
    ...tool,
    execute: async (...args: unknown[]) => {
      const startTime = Date.now();
      const [toolArgs] = args;
      const eventData = {
        arguments: JSON.stringify(toolArgs),
        timestamp: new Date().toISOString(),
        toolName,
      };

      // Log to console (goes to CloudWatch in Lambda)
      logger.debug(`Tool executed: ${toolName} - ${JSON.stringify(eventData)}`);

      // Emit custom event to Azure Application Insights
      emitCustomEvent("ToolExecuted", eventData)("mcpserver");

      try {
        // Call the original execute function and return the result
        const result = await originalExecute(...args);

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
    },
  };
}
