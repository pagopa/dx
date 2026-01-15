import { getLogger } from "@logtape/logtape";
import { Octokit } from "@octokit/rest";
import { z } from "zod";

import { CHARACTER_LIMIT, TRUNCATION_MESSAGE } from "../config/constants.js";
import { handleApiError } from "../utils/errorHandling.js";

const defaultOrg = process.env.GITHUB_SEARCH_ORG || "pagopa";

/**
 * Response format options for code search
 */
enum ResponseFormat {
  JSON = "json",
  MARKDOWN = "markdown",
}

/**
 * Pagination constants
 */
const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 10;
const MAX_PER_PAGE = 30;

/**
 * Search output type
 */
type SearchOutput = {
  has_more: boolean;
  message?: string;
  organization: string;
  page: number;
  per_page: number;
  query: string;
  results: SearchResultItem[];
  returned_results: number;
  total_pages: number;
  total_results: number;
  truncated?: boolean;
};

/**
 * Search result item type
 */
type SearchResultItem = {
  content: string;
  path: string;
  repository: string;
  url: string;
};

/**
 * Input schema for SearchGitHubCode tool (with strict mode per Anthropic guidelines)
 */
const SearchGitHubCodeInputSchema = z
  .object({
    extension: z
      .string()
      .optional()
      .describe(
        'File extension to filter results (e.g., "tf" for Terraform, "py" for Python).',
      ),
    format: z
      .nativeEnum(ResponseFormat)
      .default(ResponseFormat.MARKDOWN)
      .describe(
        "Output format: 'markdown' for human-readable or 'json' for structured data.",
      ),
    page: z
      .number()
      .int()
      .min(1, "Page must be at least 1")
      .default(DEFAULT_PAGE)
      .describe("Page number for paginated results (1-indexed, default: 1)."),
    per_page: z
      .number()
      .int()
      .min(1, "per_page must be at least 1")
      .max(MAX_PER_PAGE, `per_page cannot exceed ${MAX_PER_PAGE}`)
      .default(DEFAULT_PER_PAGE)
      .describe(
        `Number of results per page (1-${MAX_PER_PAGE}, default: ${DEFAULT_PER_PAGE}).`,
      ),
    query: z
      .string()
      .min(1, "Query cannot be empty")
      .max(500, "Query too long")
      .describe("GitHub code search query string."),
  })
  .strict();

/**
 * Type alias for validated input
 */
type SearchGitHubCodeInput = z.infer<typeof SearchGitHubCodeInputSchema>;

/**
 * Format search results as markdown
 */
function formatMarkdownResults(
  output: SearchOutput,
  isTruncated: boolean,
): string {
  const lines = [
    `# Search Results for "${output.query}"`,
    "",
    `Found **${output.total_results}** total results (showing ${output.returned_results}, page ${output.page} of ${output.total_pages})`,
    "",
  ];

  if (output.has_more) {
    lines.push(
      `> **Tip:** Use \`page: ${output.page + 1}\` to see more results.`,
    );
    lines.push("");
  }

  for (const result of output.results) {
    lines.push(`## ${result.repository}`);
    lines.push(`**Path:** \`${result.path}\``);
    lines.push(`**URL:** ${result.url}`);
    lines.push("");
    lines.push("**Content:**");
    lines.push("```");
    lines.push(result.content);
    lines.push("```");
    lines.push("");
  }

  if (isTruncated && output.message) {
    lines.push(`**Note:** ${output.message}`);
  }

  return lines.join("\n");
}

/**
 * A tool that searches for code in a GitHub organization.
 * Useful for finding examples of Terraform module usage or specific code patterns.
 */
export const SearchGitHubCodeTool = {
  annotations: {
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    title: "Search GitHub organization code",
  },
  description: `Search for code across repositories in a GitHub organization (defaults to PagoPA).

**Purpose:**
Find code examples, patterns, and usage of specific modules or libraries across the organization's repositories. Particularly useful for discovering how Terraform modules, APIs, or shared libraries are used in practice.

**Args:**
- query (string, required): GitHub code search query. Supports GitHub search syntax including qualifiers.
- extension (string, optional): Filter by file extension (e.g., "tf", "py", "ts").
- format (enum, optional): Output format - "markdown" (default) or "json".
- page (number, optional): Page number for results (1-indexed, default: 1).
- per_page (number, optional): Results per page (1-30, default: 10).

**Returns:**
- Markdown: Formatted results with repository, file path, URL, file content, and pagination hints.
- JSON: Structured object with organization, query, results array, and full pagination info (page, per_page, total_pages, has_more).

**Examples:**
- \`query: "pagopa-dx/azure-function-app/azurerm", extension: "tf"\` → Find Terraform module usage
- \`query: "from @pagopa/eslint-config", extension: "js"\` → Find eslint config imports
- \`query: "StreamableHTTPServerTransport"\` → Find MCP transport implementations

**Error Handling:**
- Returns formatted error message if GitHub API fails
- Handles rate limiting and authentication errors
- Gracefully handles inaccessible files in results

**Notes:**
- Searches the ${defaultOrg} organization by default
- Supports pagination: use \`page\` and \`per_page\` to navigate large result sets
- Maximum ${MAX_PER_PAGE} results per page
- Results are automatically truncated if they exceed character limits
- Requires valid GitHub token in session context`,

  execute: async (
    args: Record<string, unknown>,
    context?: { session?: { token?: string } },
  ): Promise<string> => {
    const logger = getLogger(["mcpserver", "github-search"]);

    try {
      const parsedArgs: SearchGitHubCodeInput =
        SearchGitHubCodeInputSchema.parse(args);

      const org = defaultOrg;
      const token = context?.session?.token;
      const format = parsedArgs.format;
      const page = parsedArgs.page;
      const perPage = parsedArgs.per_page;

      if (!token) {
        return "Error: GitHub token not available in session. Please ensure you are authenticated.";
      }

      const octokit = new Octokit({ auth: token });

      const extensionFilter = parsedArgs.extension
        ? ` extension:${parsedArgs.extension}`
        : "";
      const searchQuery = `${parsedArgs.query} org:${org}${extensionFilter}`;
      logger.info(
        `Searching GitHub: ${searchQuery} (format: ${format}, page ${page}, per_page ${perPage})`,
      );

      const { data } = await octokit.rest.search.code({
        page,
        per_page: perPage,
        q: searchQuery,
      });

      if (data.items.length === 0) {
        return format === ResponseFormat.JSON
          ? JSON.stringify(
              { message: "No results found", results: [] },
              null,
              2,
            )
          : `No results found for query: "${parsedArgs.query}"`;
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

      const validResults = results.filter(
        (r): r is SearchResultItem => r !== null,
      );

      const totalPages = Math.ceil(data.total_count / perPage);
      const hasMore = page < totalPages;

      const output: SearchOutput = {
        has_more: hasMore,
        organization: org,
        page,
        per_page: perPage,
        query: parsedArgs.query,
        results: validResults,
        returned_results: validResults.length,
        total_pages: totalPages,
        total_results: data.total_count,
      };

      const jsonOutput = JSON.stringify(output, null, 2);

      // Handle character limit
      if (jsonOutput.length > CHARACTER_LIMIT) {
        const truncatedResults = validResults.slice(
          0,
          Math.max(1, Math.floor(validResults.length / 2)),
        );
        const truncatedOutput: SearchOutput = {
          ...output,
          message: TRUNCATION_MESSAGE,
          results: truncatedResults,
          returned_results: truncatedResults.length,
          truncated: true,
        };

        const truncatedJson = JSON.stringify(truncatedOutput, null, 2);

        return format === ResponseFormat.JSON
          ? truncatedJson
          : formatMarkdownResults(truncatedOutput, true);
      }

      return format === ResponseFormat.JSON
        ? jsonOutput
        : formatMarkdownResults(output, false);
    } catch (error) {
      logger.error("Error searching GitHub code", { error });
      return handleApiError(error);
    }
  },

  name: "pagopa_search_github_code",

  parameters: SearchGitHubCodeInputSchema,
};
