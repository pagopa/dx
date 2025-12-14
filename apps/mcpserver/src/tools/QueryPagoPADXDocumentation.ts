import { z } from "zod";

import {
  kbRerankingEnabled,
  kbRuntimeClient,
  knowledgeBaseId,
} from "../config/aws.js";
import { queryKnowledgeBase } from "../services/bedrock.js";

/**
 * A tool that provides access to the complete PagoPA DX documentation.
 * It uses a Bedrock knowledge base to answer queries about DX tools, patterns, and best practices.
 */
export const QueryPagoPADXDocumentationTool = {
  annotations: {
    readOnlyHint: true,
    title: "Query PagoPA DX documentation",
  },
  description: `This tool provides access to the complete PagoPA DX documentation covering:
- Getting started, monorepo setup, dev containers, and GitHub collaboration
- Git workflows and pull requests
- DX pipelines setup and management
- TypeScript development (npm scripts, ESLint, code review)
- Terraform (folder structure, DX modules, Azure provider, pre-commit hooks, validation, deployment, drift detection)
- Azure development (naming conventions, policies, IAM, API Management, monitoring, networking, deployments, static websites, Service Bus, data archiving)
- Container development (Docker images)
- Contributing to DX (Azure provider, Terraform modules, documentation)

All prompts and questions should be written in English.
For Terraform module details (input/output variables, examples), use the \`searchModules\` tool.
`,
  execute: async (args: { query: string }): Promise<string> => {
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
