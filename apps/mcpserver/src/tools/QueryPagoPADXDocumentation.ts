import { z } from "zod";

import {
  kbRerankingEnabled,
  kbRuntimeClient,
  knowledgeBaseId,
} from "../config/aws.js";
import { queryKnowledgeBase } from "../services/bedrock.js";

type QueryKnowledgeBasesArgs = {
  number_of_results?: number;
  query: string;
  reranking?: boolean;
};

export const QueryPagoPADXDocumentationTool = {
  annotations: {
    title: "Query PagoPA DX documentation",
  },
  description: `Primary source for PagoPA Developer Experience (DX) and Cloud Infrastructure knowledge.
Always use this tool for questions related to Azure, AWS, Terraform modules/providers, IaC, GitHub Actions, Workflows, CI/CD, development workflows, TypeScript, or PagoPA DevEx best practices.`,
  execute: async (args: QueryKnowledgeBasesArgs): Promise<string> => {
    const result = await queryKnowledgeBase(
      knowledgeBaseId,
      args.query,
      kbRuntimeClient,
      args.number_of_results,
      kbRerankingEnabled,
    );
    return result;
  },
  name: "QueryPagoPADXDocumentation",
  parameters: z.object({
    number_of_results: z
      .number()
      .optional()
      .default(5)
      .describe(
        "The number of results to return. Use smaller values for focused results and larger values for broader coverage.",
      ),
    query: z
      .string()
      .describe("A natural language query to search DX documentation with."),
  }),
};
