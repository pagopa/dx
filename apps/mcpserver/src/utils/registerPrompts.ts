import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CatalogEntry } from "@pagopa/dx-mcpprompts";

import { getLogger } from "@logtape/logtape";
import { z } from "zod";

import { withPromptLogging } from "../decorators/promptUsageMonitoring.js";
import { executePrompt } from "./prompts.js";

const logger = getLogger(["mcpserver", "register-prompts"]);

/**
 * Registers all prompts with the MCP server
 */
export function registerPrompts(
  server: McpServer,
  enabledPrompts: CatalogEntry[],
): void {
  for (const catalogEntry of enabledPrompts) {
    logger.debug(`Registering prompt: ${catalogEntry.prompt.name}`);

    // Convert arguments to zod schema
    const argsSchema: Record<string, z.ZodTypeAny> = {};
    for (const arg of catalogEntry.prompt.arguments) {
      argsSchema[arg.name] = arg.required ? z.string() : z.string().optional();
    }

    server.registerPrompt(
      catalogEntry.prompt.name,
      {
        argsSchema: argsSchema,
        description: catalogEntry.prompt.description,
      },
      async (args: Record<string, unknown>) => {
        const decoratedExecutor = withPromptLogging(
          catalogEntry.id,
          executePrompt,
        );
        return await decoratedExecutor(catalogEntry, args);
      },
    );

    logger.debug(`Registered prompt: ${catalogEntry.prompt.name}`);
  }
}
