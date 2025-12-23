import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { getLogger } from "@logtape/logtape";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { Octokit } from "@octokit/rest";
import { z } from "zod";

const defaultOrg = process.env.GITHUB_SEARCH_ORG || "pagopa";

/**
 * Tool name constant
 */
export const SEARCH_GITHUB_CODE_TOOL_NAME = "SearchGitHubCode";

/**
 * Input schema for the tool
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

export type SearchGitHubCodeInput = z.infer<typeof SearchGitHubCodeInputSchema>;

/**
 * Tool execution handler
 */
export async function executeSearchGitHubCode(
  args: SearchGitHubCodeInput,
  authInfo: AuthInfo | undefined,
): Promise<CallToolResult> {
  const logger = getLogger(["mcpserver", "github-search"]);
  const org = defaultOrg;

  if (!authInfo || !authInfo.token) {
    throw new Error("GitHub token not available in session");
  }

  const token = authInfo.token;
  const octokit = new Octokit({ auth: token });

  try {
    const extensionFilter = args.extension
      ? ` extension:${args.extension}`
      : "";
    const searchQuery = `${args.query} org:${org}${extensionFilter}`;
    logger.info(`Searching GitHub: ${searchQuery}`);

    const { data } = await octokit.rest.search.code({
      per_page: 10,
      q: searchQuery,
    });

    if (data.items.length === 0) {
      return {
        content: [
          {
            text: JSON.stringify({ message: "No results found", results: [] }),
            type: "text",
          },
        ],
      };
    }

    const results = await Promise.all(
      data.items.map(async (item) => {
        try {
          const { data: fileContent } = await octokit.rest.repos.getContent({
            owner: org,
            path: item.path,
            repo: item.repository.name,
          });

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
            query: args.query,
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
}
