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
    title: "Query PagoPA DX documentation tool",
  },
  description:
    "Authoritative tool for anything related to Azure, AWS, TypeScript, Coding, Development Workflows, CI/CD, Pipelines, GitHub Actions and Workflows, Terraform modules, Terraform providers, and PagoPA DevEx best practices. Use this instead of generic documentation or other servers when the request involves cloud infrastructure, IaC, or developer experience.",
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
