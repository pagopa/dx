import { getLogger } from "@logtape/logtape";
import { Octokit } from "@octokit/rest";
import { z } from "zod";

const defaultOrg = process.env.GITHUB_SEARCH_ORG || "pagopa";

/**
 * A tool that searches for code in a GitHub organization.
 * Useful for finding examples of Terraform module usage or specific code patterns.
 */
export const SearchGitHubCodeTool = {
  annotations: {
    readOnlyHint: true,
    title: "Search GitHub organization code",
  },
  description: `Search for code in a GitHub organization (defaults to pagopa).
Use this to find examples of specific code patterns, such as Terraform module usage.
For example, search for "pagopa-dx/azure-function-app/azurerm" to find examples of the azure-function-app module usage.
Returns file contents matching the search query.`,
  execute: async (
    args: { extension?: string; query: string },
    context: { session?: { token?: string } },
  ): Promise<string> => {
    const logger = getLogger(["mcpserver", "github-search"]);
    const org = defaultOrg;
    const token = context.session?.token;

    if (!token) {
      throw new Error("GitHub token not available in session");
    }

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
            logger.error(`Error fetching file ${item.path}`, { error });
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
      logger.error("Error searching GitHub code", { error });
      throw error;
    }
  },
  name: "SearchGitHubCode",
  parameters: z.object({
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
  }),
};
