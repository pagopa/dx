/**
 * AWS configuration helpers for the MCP server.
 *
 * This module is intentionally side-effect free to keep initialization
 * controlled by the entrypoint.
 */

import { BedrockAgentRuntimeClient } from "@aws-sdk/client-bedrock-agent-runtime";

// List of AWS regions that support reranking
export const rerankingSupportedRegions = [
  "ap-northeast-1",
  "ca-central-1",
  "eu-central-1",
  "us-east-1",
  "us-west-2",
];

export type AwsRuntimeConfig = {
  knowledgeBaseId: string;
  region: string;
  rerankingEnabled: boolean;
};

type LoggerLike = {
  error: (message: string, details?: Record<string, unknown>) => void;
};

export function createBedrockRuntimeClient(
  region: string,
  logger: LoggerLike,
): BedrockAgentRuntimeClient {
  try {
    return new BedrockAgentRuntimeClient({ region });
  } catch (error) {
    logger.error("Error getting bedrock agent client", { error });
    throw error;
  }
}
