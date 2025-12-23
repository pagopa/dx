/**
 * Prompt Registration Utility
 *
 * This module provides functionality to register prompts from the centralized
 * prompt catalog with the MCP server.
 *
 * Features:
 * - Dynamic prompt registration from catalog
 * - Automatic Zod schema generation from prompt arguments
 * - Telemetry integration via withPromptLogging decorator
 * - Support for required and optional arguments
 *
 * Prompts are loaded from @pagopa/dx-mcpprompts package and registered
 * based on their enabled status in the catalog.
 *
 * @module utils/registerPrompts
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CatalogEntry } from "@pagopa/dx-mcpprompts";

import { getLogger } from "@logtape/logtape";
import { z } from "zod";

import { withPromptLogging } from "../decorators/promptUsageMonitoring.js";
import { executePrompt } from "./prompts.js";

const logger = getLogger(["mcpserver", "register-prompts"]);

/**
 * Registers all enabled prompts with the MCP server
 *
 * This function iterates through the catalog of enabled prompts and registers
 * each one with the MCP server, automatically:
 * - Converting prompt arguments to Zod schemas
 * - Wrapping handlers with telemetry
 * - Mapping catalog entries to MCP prompt format
 *
 * @param server - MCP server instance to register prompts with
 * @param enabledPrompts - Array of enabled catalog entries from @pagopa/dx-mcpprompts
 */
export function registerPrompts(
  server: McpServer,
  enabledPrompts: CatalogEntry[],
): void {
  for (const catalogEntry of enabledPrompts) {
    logger.debug(`Registering prompt: ${catalogEntry.prompt.name}`);

    // Convert catalog arguments to Zod schema for validation
    // Required arguments use z.string(), optional use z.string().optional()
    const argsSchema: Record<string, z.ZodTypeAny> = {};
    for (const arg of catalogEntry.prompt.arguments) {
      argsSchema[arg.name] = arg.required ? z.string() : z.string().optional();
    }

    // Register prompt with MCP server
    // The handler is wrapped with telemetry decorator for monitoring
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
