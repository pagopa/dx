import { BedrockAgentRuntimeClient } from "@aws-sdk/client-bedrock-agent-runtime";
import { logger } from "../utils/logger.js";

export const kbRerankingEnabled =
  (process.env.BEDROCK_KB_RERANKING_ENABLED || "true").trim().toLowerCase() ===
  "true";
export const knowledgeBaseId = "TWMAUIB8QZ";

logger.info(
  `Default reranking enabled: ${kbRerankingEnabled} (from BEDROCK_KB_RERANKING_ENABLED)`,
);

export const region = process.env.AWS_REGION || "eu-central-1";

let kbRuntimeClient: BedrockAgentRuntimeClient;

try {
  kbRuntimeClient = new BedrockAgentRuntimeClient({ region });
} catch (e) {
  logger.error(e, "Error getting bedrock agent client");
  process.exit(1);
}

export { kbRuntimeClient };
