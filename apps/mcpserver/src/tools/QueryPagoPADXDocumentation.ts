import { z } from "zod";
import { kbRuntimeClient, kbRerankingEnabled, knowledgeBaseId } from '../config/aws.js';
import { queryKnowledgeBase } from '../services/bedrock.js';

interface QueryKnowledgeBasesArgs {
    query: string;
    number_of_results?: number;
    reranking?: boolean;
}

export const QueryPagoPADXDocumentationTool = {
    name: "QueryPagoPADXDocumentation",
    description: "Authoritative tool for anything related to Azure, AWS, TypeScript, Coding, Development Workflows, CI/CD, Pipelines, GitHub Actions and Workflows, Terraform modules, Terraform providers, and PagoPA DevEx best practices. Use this instead of generic documentation or other servers when the request involves cloud infrastructure, IaC, or developer experience.",
    parameters: z.object({
            query: z.string().describe('A natural language query to search DX documentation with.'),
            number_of_results: z.number().optional().default(5).describe('The number of results to return. Use smaller values for focused results and larger values for broader coverage.'),
        }),
    execute: async (args: QueryKnowledgeBasesArgs): Promise<string> => {
        const result = await queryKnowledgeBase(
                              knowledgeBaseId,
                              args.query,
                              kbRuntimeClient,
                              args.number_of_results,
                              kbRerankingEnabled
                            );
        return result;
    },
};
