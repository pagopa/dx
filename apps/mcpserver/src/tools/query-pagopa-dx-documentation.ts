import type { BedrockAgentRuntimeClient } from "@aws-sdk/client-bedrock-agent-runtime";

import { z } from "zod";

import type { ToolDefinition } from "../types.js";

import { queryKnowledgeBase } from "../services/bedrock.js";
import { handleApiError } from "../utils/error-handling.js";

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
export const QueryPagoPADXDocumentationInputSchema = z
  .object({
    format: z
      .nativeEnum(ResponseFormat)
      .default(ResponseFormat.MARKDOWN)
      .describe(
        "Output format: 'markdown' for human-readable or 'json' for machine-readable",
      ),
    number_of_results: z
      .number()
      .int()
      .min(MIN_RESULTS, `Must return at least ${MIN_RESULTS} result`)
      .max(MAX_RESULTS, `Cannot exceed ${MAX_RESULTS} results`)
      .default(DEFAULT_NUMBER_OF_RESULTS)
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

export type QueryPagoPADXDocumentationToolConfig = {
  kbRuntimeClient: BedrockAgentRuntimeClient;
  knowledgeBaseId: string;
  rerankingEnabled: boolean;
};

type QueryPagoPADXDocumentationInput = z.infer<
  typeof QueryPagoPADXDocumentationInputSchema
>;

/**
 * A tool that provides access to the complete PagoPA DX documentation.
 * It uses a Bedrock knowledge base to answer queries about DX tools, patterns, and best practices.
 */
export function createQueryPagoPADXDocumentationTool(
  config: QueryPagoPADXDocumentationToolConfig,
): ToolDefinition {
  return {
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
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
    "number_of_results": number // How many chunks were requested
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
  - For Terraform module examples and code patterns, use the \`search_code\` tool from GitHub's MCP server

Error Handling:
  - Returns "Error: Query must be at least 3 characters" for queries too short
  - Returns "Error: Query must not exceed 500 characters" for queries too long
  - Returns "Error: ..." for API or network errors`,

    execute: async (args: Record<string, unknown>): Promise<string> => {
      const parsedArgsResult =
        QueryPagoPADXDocumentationInputSchema.safeParse(args);
      if (!parsedArgsResult.success) {
        return handleApiError(parsedArgsResult.error);
      }

      const parsedArgs: QueryPagoPADXDocumentationInput = parsedArgsResult.data;
      const numberOfResults = parsedArgs.number_of_results;

      try {
        const result = await queryKnowledgeBase(
          config.knowledgeBaseId,
          parsedArgs.query,
          config.kbRuntimeClient,
          numberOfResults,
          config.rerankingEnabled,
        );

        const format = parsedArgs.format;

        if (format === ResponseFormat.JSON) {
          return JSON.stringify(
            {
              number_of_results: numberOfResults,
              query: parsedArgs.query,
              result,
            },
            null,
            2,
          );
        }

        return result;
      } catch (error) {
        return handleApiError(error);
      }
    },

    name: "pagopa_query_documentation",

    parameters: QueryPagoPADXDocumentationInputSchema,
  };
}
