/**
 * Tool Registration Utility
 *
 * This module provides functionality to register tools implementing the ITool
 * interface with the MCP server.
 *
 * Features:
 * - Type-safe tool registration using ITool interface
 * - Automatic telemetry integration via tool decorators
 * - Support for tools with and without authentication
 * - Enhanced tool descriptions with comprehensive documentation coverage
 *
 * Tools are instantiated and registered with the MCP server, with some tools
 * requiring authentication (GitHub token) passed via RequestHandlerExtra.
 *
 * @module utils/registerTools
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getLogger } from "@logtape/logtape";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";

import { QueryPagoPADXDocumentationTool } from "../tools/QueryPagoPADXDocumentation.js";
import { SearchGitHubCodeTool } from "../tools/SearchGitHubCode.js";

const logger = getLogger(["mcpserver", "register-tools"]);

/**
 * Registers all tools with the MCP server
 *
 * This function instantiates and registers all available tools:
 * 1. QueryPagoPADXDocumentation - Semantic search over DX documentation
 * 2. SearchGitHubCode - Code search in GitHub organization (requires auth)
 *
 * Tools are registered with enhanced descriptions and proper authentication
 * handling where required.
 *
 * @param server - MCP server instance to register tools with
 */
export function registerTools(server: McpServer): void {
  // Instantiate tool classes
  const queryDocsTool = new QueryPagoPADXDocumentationTool();
  const searchGitHubTool = new SearchGitHubCodeTool();

  // Register QueryPagoPADXDocumentation tool
  // This tool queries AWS Bedrock Knowledge Base for documentation
  logger.debug(`Registering tool: ${queryDocsTool.definition.name}`);
  server.registerTool(
    queryDocsTool.definition.name,
    {
      description: `This tool provides access to the complete PagoPA DX documentation covering:
- Getting started, monorepo setup, dev containers, and GitHub collaboration
- Git workflows and pull requests
- DX pipelines setup and management
- TypeScript development (npm scripts, ESLint, code review)
- Terraform (folder structure, DX modules, Azure provider, pre-commit hooks, validation, deployment, drift detection)
- Azure development (naming conventions, policies, IAM, API Management, monitoring, networking, deployments, static websites, Service Bus, data archiving)
- Container development (Docker images)
- Contributing to DX (Azure provider, Terraform modules, documentation)

All prompts and questions should be written in English.
For Terraform module details (input/output variables, examples), use the \`searchModules\` tool.`,
      inputSchema: queryDocsTool.definition.inputSchema,
      title: queryDocsTool.definition.title,
    },
    queryDocsTool.handler,
  );
  logger.debug(`Registered tool: ${queryDocsTool.definition.name}`);

  // Register SearchGitHubCode tool (requires authentication)
  // This tool searches GitHub code using the Octokit API with user's token
  logger.debug(`Registering tool: ${searchGitHubTool.definition.name}`);
  server.registerTool(
    searchGitHubTool.definition.name,
    {
      description: `Search for code in a GitHub organization (defaults to pagopa).
Use this to find examples of specific code patterns, such as Terraform module usage.
For example, search for "pagopa-dx/azure-function-app/azurerm" to find examples of the azure-function-app module usage.
Returns file contents matching the search query.`,
      inputSchema: searchGitHubTool.definition.inputSchema,
      title: searchGitHubTool.definition.title,
    },
    async (
      args: Record<string, unknown>,
      extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
    ) =>
      // Pass authInfo from RequestHandlerExtra as sessionData to the handler
      // This allows the tool to access the GitHub token for API authentication
      searchGitHubTool.handler(
        args,
        extra.authInfo as Record<string, unknown> | undefined,
      ),
  );
  logger.debug(`Registered tool: ${searchGitHubTool.definition.name}`);
}
