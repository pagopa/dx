import { Octokit } from "@octokit/rest";
import { z } from "zod";

import { logger } from "../utils/logger.js";

const defaultOrg = process.env.GITHUB_SEARCH_ORG || "pagopa";

/**
 * A tool that searches for code in a GitHub organization.
 * Useful for finding examples of Terraform module usage or specific code patterns.
 */
export const SearchGitHubCodeTool = {
  annotations: {
    title: "Search GitHub organization code",
  },
  description: `Search for code in a GitHub organization (defaults to pagopa).
Use this to find examples of specific code patterns, such as Terraform module usage.
For example, search for "pagopa-dx/azure-function-app/azurerm" to find examples of the azure-function-app module usage.
Returns file contents matching the search query.`,
  execute: async (args: { query: string }): Promise<string> => {
    const org = defaultOrg;
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      throw new Error("GITHUB_TOKEN environment variable is required");
    }

    const octokit = new Octokit({ auth: token });

    try {
      const searchQuery = `${args.query} org:${org}`;
      logger.info(`Searching GitHub: ${searchQuery}`);

      const { data } = await octokit.rest.search.code({
        per_page: 10,
        q: searchQuery,
      });

      if (data.items.length === 0) {
        return JSON.stringify({ message: "No results found", results: [] });
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
            logger.error(error, `Error fetching file ${item.path}`);
            return null;
          }
        }),
      );

      const validResults = results.filter((r) => r !== null);

      return JSON.stringify({
        organization: org,
        query: args.query,
        results: validResults,
        returned_results: validResults.length,
        total_results: data.total_count,
      });
    } catch (error) {
      logger.error(error, "Error searching GitHub code");
      throw error;
    }
  },
  name: "SearchGitHubCode",
  parameters: z.object({
    query: z
      .string()
      .describe(
        'Code search query (e.g., "pagopa-dx/azure-function-app/azurerm" to find Terraform module usage examples)',
      ),
  }),
};
