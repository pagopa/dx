import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import {
  kbRerankingEnabled,
  kbRuntimeClient,
  knowledgeBaseId,
} from "../config/aws.js";
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
 * Tool execution handler
 */
export async function executeQueryPagoPADXDocumentation(
  args: QueryDocsInput,
): Promise<CallToolResult> {
  const result = await queryKnowledgeBase(
    knowledgeBaseId,
    args.query,
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
}
