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
    title: "Query PagoPA DX Terraform documentation",
  },
  description: `This tool provides access to the complete Terraform documentation for PagoPA Dx.
Use this knowledge base to generate or review Terraform configurations aligned with the official PagoPA Dx module conventions.
All prompts and questions should be written in English, so that the tool responds using English resource and variable names.
The tool should be used to explain, guide, or suggest Terraform usage based on verified module documentation and internal best practices.
Use only modules from the pagopa-dx namespace. To get terraform modules descriptions, input/output variables and examples, use the \`searchModules\` tool.
`,
  execute: async (args: QueryKnowledgeBasesArgs): Promise<string> => {
    const result = await queryKnowledgeBase(
      knowledgeBaseId,
      args.query,
      kbRuntimeClient,
      undefined,
      kbRerankingEnabled,
    );
    return result;
  },
  name: "QueryPagoPADXTerraformDocumentation",
  parameters: z.object({
    query: z
      .string()
      .describe(
        "A natural language query in English used to search the DX documentation for relevant information.",
      ),
  }),
};
