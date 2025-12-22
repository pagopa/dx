import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import type { CatalogEntry } from "@pagopa/dx-mcpprompts";

import { getLogger } from "@logtape/logtape";
import { emitCustomEvent } from "@pagopa/azure-tracing/logger";

const logger = getLogger(["mcpserver", "prompt-logging"]);

/**
 * Prompt execution handler type
 */
export type PromptExecutor = (
  entry: CatalogEntry,
  args: Record<string, unknown>,
) => Promise<GetPromptResult>;

/**
 * Wraps a prompt executor with telemetry and logging
 */
export function withPromptLogging(
  catalogId: string,
  executor: PromptExecutor,
): PromptExecutor {
  return async (entry, args) => {
    const eventData = {
      arguments: JSON.stringify(args),
      promptId: catalogId,
      promptName: entry.prompt.name,
      timestamp: new Date().toISOString(),
    };

    // Log to console (goes to CloudWatch in Lambda)
    logger.debug(
      `Prompt requested: ${entry.prompt.name} - ${JSON.stringify(eventData)}`,
    );

    // Emit custom event to Azure Application Insights
    emitCustomEvent("PromptRequested", {
      arguments: JSON.stringify(args),
      promptId: catalogId,
      promptName: entry.prompt.name,
    })("mcpserver");

    // Call the original executor and return the result
    return await executor(entry, args);
  };
}
