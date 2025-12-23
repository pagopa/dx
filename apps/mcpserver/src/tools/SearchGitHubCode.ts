/**
 * GitHub Code Search Tool
 *
 * This tool provides semantic code search capabilities across the PagoPA GitHub
 * organization, allowing users to find real-world examples of code patterns,
 * Terraform module usage, and configuration examples.
 *
 * Features:
 * - Organization-scoped search (defaults to 'pagopa')
 * - File extension filtering
 * - Content retrieval for matching files
 * - GitHub token authentication
 *
 * Use cases:
 * - Finding Terraform module usage examples
 * - Discovering configuration patterns
 * - Locating specific code implementations
 *
 * @module tools/SearchGitHubCode
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { getLogger } from "@logtape/logtape";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { Octokit } from "@octokit/rest";
import { z } from "zod";

import type { ITool, ToolDefinition } from "../types/ITool.js";

import { withToolLogging } from "../decorators/toolUsageMonitoring.js";

// Default GitHub organization to search (configurable via env var)
const defaultOrg = process.env.GITHUB_SEARCH_ORG || "pagopa";

/**
 * Tool name constant for SearchGitHubCode
 */
export const SEARCH_GITHUB_CODE_TOOL_NAME = "SearchGitHubCode";

/**
 * Input validation schema for GitHub code search
 *
 * Validates search parameters using Zod to ensure type safety
 * and provide clear error messages for invalid inputs.
 */
export const SearchGitHubCodeInputSchema = z.object({
  extension: z
    .string()
    .optional()
    .describe(
      'File extension to filter results (e.g., "tf" for Terraform files, "py" for Python files). For example, you can use "tf" to find Terraform module usage examples.',
    ),
  query: z
    .string()
    .describe(
      'Code search query (e.g., "pagopa-dx/azure-function-app/azurerm" to find Terraform module usage examples)',
    ),
});

/**
 * Type-safe input for SearchGitHubCode tool
 */
export type SearchGitHubCodeInput = z.infer<typeof SearchGitHubCodeInputSchema>;

/**
 * GitHub Code Search Tool Implementation
 *
 * This tool searches for code across the PagoPA GitHub organization,
 * requiring OAuth authentication to access the GitHub API.
 *
 * The tool:
 * 1. Validates input parameters (query, optional extension filter)
 * 2. Authenticates with GitHub using the provided token
 * 3. Performs code search with optional extension filtering
 * 4. Retrieves file contents for matching results
 * 5. Returns formatted results with file paths and content
 */
export class SearchGitHubCodeTool implements ITool {
  public readonly definition: ToolDefinition = {
    description:
      'Searches for code in the PagoPA GitHub organization. Useful for finding examples of Terraform module usage, configuration patterns, or specific code implementations. Example: query="pagopa-dx/azure-function-app" extension="tf"',
    inputSchema: SearchGitHubCodeInputSchema,
    name: SEARCH_GITHUB_CODE_TOOL_NAME,
    title: "Search GitHub Code in PagoPA Organization",
  };

  /**
   * Handler with automatic logging
   */
  public handler = withToolLogging(
    SEARCH_GITHUB_CODE_TOOL_NAME,
    async (
      args: Record<string, unknown>,
      sessionData?: Record<string, unknown>,
    ): Promise<CallToolResult> => {
      // Type guard to extract AuthInfo from session data
      // AuthInfo contains the GitHub token needed for API authentication
      const authInfo = sessionData as AuthInfo | undefined;
      const logger = getLogger(["mcpserver", "github-search"]);

      // Validate and parse input arguments using Zod schema
      const validated = SearchGitHubCodeInputSchema.parse(args);
      const org = defaultOrg;

      // Ensure GitHub token is available for authentication
      if (!authInfo || !authInfo.token) {
        throw new Error("GitHub token not available in session");
      }

      const token = authInfo.token;
      // Initialize Octokit client with authentication
      const octokit = new Octokit({ auth: token });

      try {
        // Build search query with optional extension filter
        // Example: "pagopa-dx/azure-function-app org:pagopa extension:tf"
        const extensionFilter = validated.extension
          ? ` extension:${validated.extension}`
          : "";
        const searchQuery = `${validated.query} org:${org}${extensionFilter}`;
        logger.info(`Searching GitHub: ${searchQuery}`);

        const { data } = await octokit.rest.search.code({
          per_page: 10,
          q: searchQuery,
        });

        if (data.items.length === 0) {
          return {
            content: [
              {
                text: JSON.stringify({
                  message: "No results found",
                  results: [],
                }),
                type: "text",
              },
            ],
          };
        }

        const results = await Promise.all(
          data.items.map(async (item) => {
            try {
              const { data: fileContent } = await octokit.rest.repos.getContent(
                {
                  owner: org,
                  path: item.path,
                  repo: item.repository.name,
                },
              );

              if ("content" in fileContent) {
                return {
                  content: Buffer.from(fileContent.content, "base64").toString(
                    "utf-8",
                  ),
                  path: item.path,
                  repository: item.repository.full_name,
                  url: item.html_url,
                };
              }
              return null;
            } catch (error) {
              logger.error(`Error fetching file ${item.path}`, { error });
              return null;
            }
          }),
        );

        const validResults = results.filter((r) => r !== null);

        return {
          content: [
            {
              text: JSON.stringify({
                organization: org,
                query: validated.query,
                results: validResults,
                returned_results: validResults.length,
                total_results: data.total_count,
              }),
              type: "text",
            },
          ],
        };
      } catch (error) {
        logger.error("Error searching GitHub code", { error });
        throw error;
      }
    },
  );
}
