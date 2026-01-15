import { z } from "zod";

import {
  kbRerankingEnabled,
  kbRuntimeClient,
  knowledgeBaseId,
} from "../config/aws.js";
import { CHARACTER_LIMIT, TRUNCATION_MESSAGE } from "../config/constants.js";
import { queryKnowledgeBase } from "../services/bedrock.js";
import { handleApiError } from "../utils/errorHandling.js";

/**
 * Response format options for documentation queries
 */
enum ResponseFormat {
  JSON = "json",
  MARKDOWN = "markdown",
}

/**
 * Pagination constants
 */
const DEFAULT_NUMBER_OF_RESULTS = 5;
const MIN_RESULTS = 1;
const MAX_RESULTS = 20;

/**
 * Zod schema for QueryPagoPADXDocumentation input validation
 */
const QueryPagoPADXDocumentationInputSchema = z
  .object({
    format: z
      .nativeEnum(ResponseFormat)
      .default(ResponseFormat.MARKDOWN)
      .describe(
        "Output format: 'markdown' for human-readable or 'json' for machine-readable",
      )
      .optional(),
    number_of_results: z
      .number()
      .int()
      .min(MIN_RESULTS, `Must return at least ${MIN_RESULTS} result`)
      .max(MAX_RESULTS, `Cannot exceed ${MAX_RESULTS} results`)
      .default(DEFAULT_NUMBER_OF_RESULTS)
      .optional()
      .describe(
        `Number of documentation chunks to retrieve (${MIN_RESULTS}-${MAX_RESULTS}, default: ${DEFAULT_NUMBER_OF_RESULTS}). Use more for comprehensive answers, fewer for quick lookups.`,
      ),
    query: z
      .string()
      .min(3, "Query must be at least 3 characters")
      .max(500, "Query must not exceed 500 characters")
      .describe(
        "A natural language query in English used to search the DX documentation for relevant information.",
      ),
  })
  .strict();

type QueryPagoPADXDocumentationInput = z.infer<
  typeof QueryPagoPADXDocumentationInputSchema
>;

/**
 * A tool that provides access to the complete PagoPA DX documentation.
 * It uses a Bedrock knowledge base to answer queries about DX tools, patterns, and best practices.
 */
export const QueryPagoPADXDocumentationTool = {
  annotations: {
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: true,
    title: "Query PagoPA DX Documentation",
  },
  description: `Query the PagoPA DX documentation knowledge base for information about developer tools, patterns, and best practices.

This tool provides access to the complete PagoPA DX documentation covering:
- Getting started, monorepo setup, dev containers, and GitHub collaboration
- Git workflows and pull requests
- DX pipelines setup and management
- TypeScript development (npm scripts, ESLint, code review)
- Terraform (folder structure, DX modules, Azure provider, pre-commit hooks, validation, deployment, drift detection)
- Azure development (naming conventions, policies, IAM, API Management, monitoring, networking, deployments, static websites, Service Bus, data archiving)
- Container development (Docker images)
- Contributing to DX (Azure provider, Terraform modules, documentation)

Args:
  - query (string, required): Natural language query in English (3-500 characters)
  - format ('markdown' | 'json', optional): Output format (default: 'markdown')
  - number_of_results (number, optional): Number of documentation chunks to retrieve (1-20, default: 5)

Returns:
  For JSON format:
  {
    "query": string,           // The original query
    "result": string,          // Documentation content matching the query
    "number_of_results": number, // How many chunks were requested
    "truncated": boolean       // Whether the result was truncated due to size limits
  }

  For Markdown format:
  Human-readable documentation content with proper formatting.

Examples:
  - "How do I set up a new Terraform module?" -> Returns step-by-step guide
  - "What are the Azure naming conventions?" -> Returns naming standards
  - "How to configure ESLint for TypeScript?" -> Returns configuration guide

Notes:
  - All queries should be written in English
  - Use \`number_of_results: 1-3\` for quick lookups, \`10-20\` for comprehensive research
  - For Terraform module details (input/output variables, examples), use \`pagopa_search_github_code\` instead
  - Results may be truncated if they exceed ${CHARACTER_LIMIT} characters

Error Handling:
  - Returns "Error: Query must be at least 3 characters" for queries too short
  - Returns "Error: Query must not exceed 500 characters" for queries too long
  - Returns "Error: ..." for API or network errors`,

  execute: async (args: Record<string, unknown>): Promise<string> => {
    try {
      // Parse and validate input using Zod schema
      const parsedArgs: QueryPagoPADXDocumentationInput =
        QueryPagoPADXDocumentationInputSchema.parse(args);

      const numberOfResults =
        parsedArgs.number_of_results ?? DEFAULT_NUMBER_OF_RESULTS;

      const result = await queryKnowledgeBase(
        knowledgeBaseId,
        parsedArgs.query,
        kbRuntimeClient,
        numberOfResults,
        kbRerankingEnabled,
      );

      const format = parsedArgs.format || ResponseFormat.MARKDOWN;

      // Build structured output
      const output = {
        number_of_results: numberOfResults,
        query: parsedArgs.query,
        result,
        truncated: false,
      };

      // Handle character limit
      if (result.length > CHARACTER_LIMIT) {
        const truncated = result.substring(0, CHARACTER_LIMIT);
        output.result = truncated;
        output.truncated = true;

        return format === ResponseFormat.JSON
          ? JSON.stringify(
              {
                ...output,
                message: TRUNCATION_MESSAGE,
              },
              null,
              2,
            )
          : `${truncated}\n\n**Note:** ${TRUNCATION_MESSAGE}`;
      }

      return format === ResponseFormat.JSON
        ? JSON.stringify(output, null, 2)
        : result;
    } catch (error) {
      return handleApiError(error);
    }
  },

  parameters: QueryPagoPADXDocumentationInputSchema,
};
