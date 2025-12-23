/**
 * PagoPA DX Documentation Query Tool
 *
 * This tool provides natural language querying capabilities for the PagoPA DX
 * documentation using AWS Bedrock Knowledge Base for semantic search.
 *
 * Features:
 * - Natural language queries in English
 * - Semantic search with vector similarity
 * - Optional result reranking for improved relevance
 * - Integration with AWS Bedrock Knowledge Base
 *
 * The tool queries a Knowledge Base containing:
 * - Getting started guides and monorepo setup
 * - Git workflows and collaboration patterns
 * - DX pipeline configurations
 * - TypeScript development best practices
 * - Terraform module documentation and examples
 * - Azure development guides (naming, policies, networking, etc.)
 * - Container development guides
 *
 * @module tools/QueryPagoPADXDocumentation
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import type { ITool, ToolDefinition } from "../types/ITool.js";

import {
  kbRerankingEnabled,
  kbRuntimeClient,
  knowledgeBaseId,
} from "../config/aws.js";
import { withToolLogging } from "../decorators/toolUsageMonitoring.js";
import { queryKnowledgeBase } from "../services/bedrock.js";

/**
 * Tool name constant
 */
export const QUERY_DOCS_TOOL_NAME = "QueryPagoPADXTerraformDocumentation";

/**
 * Input schema for the tool
 */
export const QueryDocsInputSchema = z.object({
  query: z
    .string()
    .describe(
      "A natural language query in English used to search the DX documentation for relevant information.",
    ),
});

export type QueryDocsInput = z.infer<typeof QueryDocsInputSchema>;

/**
 * PagoPA DX Documentation Query Tool Implementation
 *
 * This tool implements semantic search over the PagoPA DX documentation
 * using AWS Bedrock Knowledge Base.
 *
 * The tool:
 * 1. Validates the natural language query
 * 2. Queries AWS Bedrock Knowledge Base with semantic search
 * 3. Optionally applies reranking for improved relevance
 * 4. Returns formatted results with source citations
 *
 * All queries should be in English for best results.
 */
export class QueryPagoPADXDocumentationTool implements ITool {
  public readonly definition: ToolDefinition = {
    description:
      "Searches the PagoPA DX Terraform documentation to find relevant information about modules, best practices, and usage examples. Use this tool when you need specific information about PagoPA DX infrastructure patterns.",
    inputSchema: QueryDocsInputSchema,
    name: QUERY_DOCS_TOOL_NAME,
    title: "Query PagoPA DX Terraform Documentation",
  };

  /**
   * Handler with automatic logging
   */
  public handler = withToolLogging(
    QUERY_DOCS_TOOL_NAME,
    async (args: Record<string, unknown>): Promise<CallToolResult> => {
      const validated = QueryDocsInputSchema.parse(args);
      const result = await queryKnowledgeBase(
        knowledgeBaseId,
        validated.query,
        kbRuntimeClient,
        undefined,
        kbRerankingEnabled,
      );

      return {
        content: [
          {
            text: result,
            type: "text",
          },
        ],
      };
    },
  );
}
