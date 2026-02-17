import {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand,
  type RetrieveAndGenerateResponse,
} from "@aws-sdk/client-bedrock-agent-runtime";
import { getLogger } from "@logtape/logtape";

/**
 * Calls Bedrock RetrieveAndGenerate API to get an AI-generated answer
 * based on documents from a knowledge base.
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
