import { BedrockAgentRuntimeClient } from "@aws-sdk/client-bedrock-agent-runtime";

import { logger } from "../utils/logger.js";

// When true, enables reranking for the Bedrock knowledge base queries.
export const kbRerankingEnabled =
  (process.env.BEDROCK_KB_RERANKING_ENABLED || "true").trim().toLowerCase() ===
  "true";
export const knowledgeBaseId = process.env.BEDROCK_KNOWLEDGE_BASE_ID || "";

logger.info(
  `Default reranking enabled: ${kbRerankingEnabled} (from BEDROCK_KB_RERANKING_ENABLED)`,
);

export const region = process.env.AWS_REGION || "eu-central-1";

// List of AWS regions that support reranking
export const rerankingSupportedRegions = [
  "ap-northeast-1",
  "ca-central-1",
  "eu-central-1",
  "us-east-1",
  "us-west-2",
];

let kbRuntimeClient: BedrockAgentRuntimeClient;

try {
  // Initializes the Bedrock Agent Runtime client with the specified region.
  kbRuntimeClient = new BedrockAgentRuntimeClient({ region });
} catch (e) {
  logger.error(e, "Error getting bedrock agent client");
  process.exit(1);
}

export { kbRuntimeClient };
