import { getLogger } from "@logtape/logtape";
import { emitCustomEvent } from "@pagopa/azure-tracing/logger";
import type { PromptDefinition } from "@pagopa/dx-mcpprompts";

const logger = getLogger(["mcpserver", "prompt-logging"]);

/**
 * Filter out undefined values from an object to match emitCustomEvent expectations
 */
function filterUndefined(
  obj: Record<string, string | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Record<string, string>;
}

/**
 * Decorator that adds logging to prompt load functions.
 * Logs when a prompt is requested to both console and Azure Application Insights.
 */
export function withPromptLogging(
  prompt: PromptDefinition,
  catalogId: string,
  requestId?: string,
): PromptDefinition {
  const originalLoad = prompt.load;

  return {
    ...prompt,
    load: async (args: Record<string, unknown>) => {
      // Log to console (goes to CloudWatch in Lambda)
      logger.debug(`Prompt requested: ${prompt.name} (ID: ${catalogId})`);

      // Emit custom event to Azure Application Insights
      // Note: Arguments are not logged to avoid exposing sensitive data
      emitCustomEvent(
        "PromptRequested",
        filterUndefined({
          promptId: catalogId,
          promptName: prompt.name,
          requestId,
          timestamp: new Date().toISOString(),
        }),
      )("mcpserver");

      // Call the original load function and return the result
      return await originalLoad(args);
    },
  };
}
