import {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand,
  type RetrieveAndGenerateResponse,
} from "@aws-sdk/client-bedrock-agent-runtime";
import { getLogger } from "@logtape/logtape";

/**
 * Restricts the model to answer only from the retrieved KB documents.
 * Must include $search_results$ for Bedrock to inject retrieved content.
 * If the query is off-topic or no relevant docs are found, the model is
 * instructed to decline rather than fall back to general knowledge.
 */
const SCOPED_PROMPT_TEMPLATE = `You are a documentation assistant for PagoPA DX (Developer Experience).
Your sole purpose is to answer questions about PagoPA DX tools, infrastructure patterns, GitHub workflows, Terraform modules, and developer best practices.

Rules you must always follow:
1. Answer ONLY using the information in the search results below. Never use external or general knowledge.
2. If the search results do not contain enough information to answer, respond: "I don't have information about this topic in the PagoPA DX knowledge base."
3. If the question is unrelated to PagoPA DX (e.g. general trivia, unrelated technologies, off-topic subjects), respond: "This question is outside the scope of the PagoPA DX documentation. I can only help with PagoPA DX tools, infrastructure, and developer workflows."
4. Never answer questions about unrelated topics, even if you have general knowledge about them.

Search results from the PagoPA DX knowledge base:
$search_results$

$output_format_instructions$`;

/**
 * Calls Bedrock RetrieveAndGenerate API to get an AI-generated answer
 * based on documents from a knowledge base.
 *
 * A scoped prompt template is applied so the model is constrained to answer
 * only from the retrieved KB documents, refusing off-topic queries.
 *
 * @param knowledgeBaseId The ID of the knowledge base to query
 * @param modelArn The ARN of the Bedrock model to use for generation
 * @param query The user's natural language query
 * @param kbAgentClient The Bedrock Agent Runtime client
 * @param numberOfResults The maximum number of documents to retrieve (default: 5)
 * @returns The complete RetrieveAndGenerate response including answer and citations
 */
export async function retrieveAndGenerate(
  knowledgeBaseId: string,
  modelArn: string,
  query: string,
  kbAgentClient: BedrockAgentRuntimeClient,
  numberOfResults = 5,
): Promise<RetrieveAndGenerateResponse> {
  const logger = getLogger(["mcpserver", "bedrock", "retrieve-and-generate"]);

  try {
    const command = new RetrieveAndGenerateCommand({
      input: {
        text: query,
      },
      retrieveAndGenerateConfiguration: {
        knowledgeBaseConfiguration: {
          knowledgeBaseId,
          modelArn,
          generationConfiguration: {
            promptTemplate: {
              textPromptTemplate: SCOPED_PROMPT_TEMPLATE,
            },
          },
          retrievalConfiguration: {
            vectorSearchConfiguration: {
              numberOfResults,
            },
          },
        },
        type: "KNOWLEDGE_BASE",
      },
    });

    logger.debug("Calling RetrieveAndGenerate", {
      knowledgeBaseId,
      modelArn,
      numberOfResults,
      query,
    });

    const response = await kbAgentClient.send(command);

    logger.info("RetrieveAndGenerate successful", {
      sessionId: response.sessionId,
    });

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "Unknown";
    const errorCode = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;
    const errorType = (error as { __type?: string }).__type;

    logger.error(
      `RetrieveAndGenerate failed: ${errorName} - ${errorMessage}. KB: ${knowledgeBaseId}, Model: ${modelArn}, HTTP Status: ${errorCode}, Type: ${errorType}`,
    );
    throw error;
  }
}
