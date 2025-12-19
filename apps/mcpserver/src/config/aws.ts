import { BedrockAgentRuntimeClient } from "@aws-sdk/client-bedrock-agent-runtime";
import { getLogger } from "@logtape/logtape";

const logger = getLogger(["mcpserver", "aws-config"]);

/**
 * Feature flag that enables reranking for Bedrock knowledge base queries.
 * Defaults to true when the env var is not set.
 */
export const kbRerankingEnabled =
  (process.env.BEDROCK_KB_RERANKING_ENABLED || "true").trim().toLowerCase() ===
  "true";

/**
 * Identifier of the knowledge base to query via Bedrock.
 */
export const knowledgeBaseId = process.env.BEDROCK_KNOWLEDGE_BASE_ID || "";

logger.debug(
  `Default reranking enabled: ${kbRerankingEnabled} (from BEDROCK_KB_RERANKING_ENABLED)`,
);

/**
 * AWS region used for Bedrock and SSM interactions.
 */
export const region = process.env.AWS_REGION || "eu-central-1";

/**
 * List of AWS regions that currently support reranking.
 */
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
  logger.error("Error getting bedrock agent client", { error: e });
  process.exit(1);
}

export { kbRuntimeClient };
