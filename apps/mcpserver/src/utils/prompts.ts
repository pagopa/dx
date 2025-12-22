import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import type { CatalogEntry } from "@pagopa/dx-mcpprompts";

import { getLogger } from "@logtape/logtape";

const logger = getLogger(["mcpserver", "prompts"]);

/**
 * Handles prompt execution for SDK
 */
export async function executePrompt(
  entry: CatalogEntry,
  args: Record<string, unknown>,
): Promise<GetPromptResult> {
  logger.debug(`Executing prompt: ${entry.prompt.name}`);

  // Call the prompt's load function
  const content = await entry.prompt.load(args);

  return {
    description: entry.metadata.description,
    messages: [
      {
        content: {
          text: content,
          type: "text",
        },
        role: "user",
      },
    ],
  };
}
