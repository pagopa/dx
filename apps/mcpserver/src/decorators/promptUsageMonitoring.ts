import type { Prompt } from "fastmcp";

import { getLogger } from "@logtape/logtape";
import { emitCustomEvent } from "@pagopa/azure-tracing/logger";

const logger = getLogger(["mcpserver", "prompt-logging"]);

/**
 * Decorates a FastMCP prompt to emit telemetry and debug logs whenever it is loaded.
 * @param prompt Prompt definition to wrap.
 * @param catalogId Catalog identifier used for traceability in telemetry.
 * @returns Wrapped prompt with logging side effects.
 */
export function withPromptLogging(prompt: Prompt, catalogId: string): Prompt {
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
