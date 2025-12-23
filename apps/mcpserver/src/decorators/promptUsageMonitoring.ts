/**
 * Prompt Usage Monitoring Decorator
 *
 * This module provides a decorator function for wrapping prompt executors with
 * automatic telemetry and logging.
 *
 * Features:
 * - Request logging with arguments
 * - Azure Application Insights integration
 * - CloudWatch logging (in Lambda)
 * - Catalog entry tracking
 *
 * Similar to tool monitoring but specialized for prompt requests.
 *
 * @module decorators/promptUsageMonitoring
 */

import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import type { CatalogEntry } from "@pagopa/dx-mcpprompts";

import { getLogger } from "@logtape/logtape";
import { emitCustomEvent } from "@pagopa/azure-tracing/logger";

const logger = getLogger(["mcpserver", "prompt-logging"]);

/**
 * Prompt execution handler type
 *
 * @param entry - Catalog entry containing prompt definition
 * @param args - Arguments for prompt template variables
 * @returns Promise resolving to GetPromptResult
 */
export type PromptExecutor = (
  entry: CatalogEntry,
  args: Record<string, unknown>,
) => Promise<GetPromptResult>;

/**
 * Wraps a prompt executor with telemetry and logging
 *
 * This decorator function adds observability to prompt requests by:
 * 1. Logging prompt invocation with catalog ID and arguments
 * 2. Emitting custom events to Azure Application Insights
 * 3. Preserving original prompt behavior
 *
 * Unlike tool monitoring, prompt monitoring focuses on request tracking
 * rather than execution time, as prompts are typically lightweight templates.
 *
 * @param catalogId - Unique identifier for the prompt in the catalog
 * @param executor - The original prompt execution function
 * @returns Wrapped executor with telemetry
 *
 * @example
 * ```typescript
 * const handler = withPromptLogging(
 *   'terraform-config-gen',
 *   async (entry, args) => {
 *     // Prompt logic here
 *     return { messages: [...] };
 *   }
 * );
 * ```
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

    // Log to console (CloudWatch in Lambda, stdout in local dev)
    logger.debug(
      `Prompt requested: ${entry.prompt.name} - ${JSON.stringify(eventData)}`,
    );

    // Emit custom event to Azure Application Insights for analytics
    emitCustomEvent("PromptRequested", {
      arguments: JSON.stringify(args),
      promptId: catalogId,
      promptName: entry.prompt.name,
    })("mcpserver");

    // Execute the original prompt handler and return the result
    return await executor(entry, args);
  };
}
