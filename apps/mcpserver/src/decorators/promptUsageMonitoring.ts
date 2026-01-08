import type { PromptDefinition } from "@pagopa/dx-mcpprompts";

import { getLogger } from "@logtape/logtape";
import { emitCustomEvent } from "@pagopa/azure-tracing/logger";

const logger = getLogger(["mcpserver", "prompt-logging"]);

/**
 * Decorator that adds logging to prompt load functions.
 * Logs when a prompt is requested to both console and Azure Application Insights.
 */
export function withPromptLogging(
  prompt: PromptDefinition,
  catalogId: string,
): PromptDefinition {
  const originalLoad = prompt.load;

  return {
    ...prompt,
    load: async (args) => {
      const eventData = {
        arguments: JSON.stringify(args),
        promptId: catalogId,
        promptName: prompt.name,
        timestamp: new Date().toISOString(),
      };

      // Log to console (goes to CloudWatch in Lambda)
      logger.debug(
        `Prompt requested: ${prompt.name} - ${JSON.stringify(eventData)}`,
      );

      // Emit custom event to Azure Application Insights
      emitCustomEvent("PromptRequested", {
        arguments: JSON.stringify(args),
        promptId: catalogId,
        promptName: prompt.name,
      })("mcpserver");

      // Call the original load function and return the result
      return await originalLoad(args);
    },
  };
}
