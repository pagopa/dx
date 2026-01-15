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
 * Tool entry for the registry with registration metadata
 */
export type ToolEntry = {
  /** Unique tool ID for registration (snake_case, prefixed with service name) */
  id: string;
  /** Whether the tool requires session context (e.g., GitHub token) */
  requiresSession?: boolean;
  /** The tool definition with all metadata */
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
    id: "pagopa_query_documentation",
    requiresSession: false,
    tool: QueryPagoPADXDocumentationTool,
  },
  {
    id: "pagopa_search_github_code",
    requiresSession: true,
    tool: SearchGitHubCodeTool,
  },
];
