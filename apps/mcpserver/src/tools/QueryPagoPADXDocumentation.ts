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
 * Tool class for querying PagoPA DX documentation
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

/**
 * Execute function for backward compatibility with tests
 */
export async function executeQueryPagoPADXDocumentation(
  input: QueryDocsInput,
): Promise<string> {
  return await queryKnowledgeBase(
    knowledgeBaseId,
    input.query,
    kbRuntimeClient,
    undefined,
    kbRerankingEnabled,
  );
}
