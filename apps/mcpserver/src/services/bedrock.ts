import {
  BedrockAgentRuntimeClient,
  KnowledgeBaseRetrievalConfiguration,
  RetrieveCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

import { logger } from "../utils/logger.js";

type RerankingModelName = "AMAZON" | "COHERE";

export async function queryKnowledgeBase(
  knowledgeBaseId: string,
  query: string,
  kbAgentClient: BedrockAgentRuntimeClient,
  numberOfResults = 20,
  reranking = false,
  rerankingModelName: RerankingModelName = "AMAZON",
): Promise<string> {
  const clientRegion = await kbAgentClient.config.region();
  let rerankingEnabled = reranking;
  if (
    reranking &&
    ![
      "ap-northeast-1",
      "ca-central-1",
      "eu-central-1",
      "us-east-1",
      "us-west-2",
    ].includes(clientRegion)
  ) {
    logger.warn(`Reranking is not supported in region ${clientRegion}`);
    rerankingEnabled = false;
  }

  const retrieveRequest: KnowledgeBaseRetrievalConfiguration = {
    vectorSearchConfiguration: {
      numberOfResults,
    },
  };

  if (rerankingEnabled && retrieveRequest.vectorSearchConfiguration) {
    const modelNameMapping: Record<RerankingModelName, string> = {
      AMAZON: "amazon.rerank-v1:0",
      COHERE: "cohere.rerank-v3-5:0",
    };
    retrieveRequest.vectorSearchConfiguration.rerankingConfiguration = {
      bedrockRerankingConfiguration: {
        modelConfiguration: {
          modelArn: `arn:aws:bedrock:${clientRegion}::foundation-model/${modelNameMapping[rerankingModelName]}`,
        },
      },
      type: "BEDROCK_RERANKING_MODEL",
    };
  }

  const command = new RetrieveCommand({
    knowledgeBaseId,
    retrievalConfiguration: retrieveRequest,
    retrievalQuery: { text: query },
  });

  const response = await kbAgentClient.send(command);
  const results = response.retrievalResults || [];
  const documents: Record<string, unknown>[] = [];

  for (const result of results) {
    if (result.content?.type === "IMAGE") {
      logger.warn("Images are not supported at this time. Skipping...");
      continue;
    } else if (result.content?.text) {
      documents.push({
        content: result.content.text,
        location: result.location || "",
        score: result.score || "",
      });
    }
  }

  return documents.map((doc) => JSON.stringify(doc)).join("\n\n");
}
