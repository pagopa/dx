/**
 * Tool registry for dynamic tool registration
 *
 * This file provides a centralized, scalable way to manage MCP tools.
 * Adding a new tool only requires adding it to the toolDefinitions array.
 */

import type { ToolDefinition } from "../types.js";

import { QueryPagoPADXDocumentationTool } from "./QueryPagoPADXDocumentation.js";
import { SearchGitHubCodeTool } from "./SearchGitHubCode.js";

/**
 * Tool definition with metadata for dynamic registration
 */
export type ToolEntry = {
  /** Whether this operation can modify data */
  destructiveHint?: boolean;
  /** Unique tool ID for registration (snake_case, no hardcoded service name duplication) */
  id: string;
  /** Whether the operation produces same results for same inputs */
  idempotentHint?: boolean;
  /** Whether the tool can work with open-ended inputs */
  openWorldHint?: boolean;
  /** Whether this is a read-only operation */
  readOnlyHint?: boolean;
  /** Whether the tool requires session context (e.g., GitHub token) */
  requiresSession?: boolean;
  /** The tool definition */
  tool: ToolDefinition;
};

/**
 * Centralized registry of all available tools
 * To add a new tool:
 * 1. Add the tool definition file in this directory
 * 2. Import it at the top
 * 3. Add an entry to this array
 *
 * Tool naming convention (per Anthropic MCP guidelines):
 * - Use snake_case
 * - Prefix with service name to avoid conflicts (e.g., pagopa_*)
 */
export const toolDefinitions: ToolEntry[] = [
  {
    destructiveHint: false,
    id: "pagopa_query_documentation",
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    requiresSession: false,
    tool: QueryPagoPADXDocumentationTool,
  },
  {
    destructiveHint: false,
    id: "pagopa_search_github_code",
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    requiresSession: true,
    tool: SearchGitHubCodeTool,
  },
];
