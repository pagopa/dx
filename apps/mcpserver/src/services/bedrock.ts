/**
 * AWS Bedrock Knowledge Base Service
 *
 * This module provides functionality to query AWS Bedrock Knowledge Bases
 * for retrieving documentation and content using semantic search.
 *
 * Features:
 * - Semantic search with vector similarity
 * - Optional result reranking (region-dependent)
 * - S3 location to public URL conversion
 * - Result serialization for MCP responses
 *
 * Supported reranking models:
 * - AMAZON (amazon.rerank-v1:0)
 * - COHERE (cohere.rerank-v3-5:0)
 *
 * Note: Reranking is only available in specific AWS regions.
 * See rerankingSupportedRegions in config/aws.ts
 *
 * @module services/bedrock
 */

import {
  BedrockAgentRuntimeClient,
  KnowledgeBaseRetrievalConfiguration,
  RetrievalResultLocation,
  RetrieveCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";
import { getLogger } from "@logtape/logtape";

import { rerankingSupportedRegions } from "../config/aws.js";

/**
 * Output structure for knowledge base query results
 */
export type QueryKnowledgeBasesOutput = {
  /** The text content of the retrieved chunk */
  content: string;
  /** Optional location metadata (S3 URI or public URL) */
  location?: RetrievalResultLocation;
  /** Relevance score (0.0 to 1.0, or -1.0 if unavailable) */
  score: number;
};

/**
 * Supported reranking model names
 */
type RerankingModelName = "AMAZON" | "COHERE";

/**
 * Queries an AWS Bedrock Knowledge Base using semantic search
 *
 * This function performs a semantic search against a Bedrock Knowledge Base,
 * optionally applying reranking to improve result relevance. Results are
 * returned as a formatted string suitable for MCP responses.
 *
 * Process:
 * 1. Validate reranking availability in the current AWS region
 * 2. Configure retrieval with optional reranking
 * 3. Execute semantic search query
 * 4. Filter and process results (skip images)
 * 5. Convert S3 locations to public URLs
 * 6. Serialize results to formatted string
 *
 * @param knowledgeBaseId - AWS Bedrock Knowledge Base ID
 * @param query - Natural language search query
 * @param kbAgentClient - Configured Bedrock Agent Runtime client
 * @param numberOfResults - Maximum results to return (default: 5)
 * @param reranking - Enable result reranking if available (default: false)
 * @param rerankingModelName - Reranking model to use (default: AMAZON)
 * @returns Formatted string containing search results with sources
 *
 * @example
 * ```typescript
 * const results = await queryKnowledgeBase(
 *   'kb-abc123',
 *   'How to deploy a function app?',
 *   client,
 *   5,
 *   true,
 *   'AMAZON'
 * );
 * ```
 *
 * @throws Error if the Bedrock API request fails
 */
export async function queryKnowledgeBase(
  knowledgeBaseId: string,
  query: string,
  kbAgentClient: BedrockAgentRuntimeClient,
  numberOfResults = 5,
  reranking = false,
  rerankingModelName: RerankingModelName = "AMAZON",
): Promise<string> {
  const logger = getLogger(["mcpserver", "bedrock"]);
  const clientRegion = await kbAgentClient.config.region();
  let rerankingEnabled = reranking;

  // Check if reranking is supported in the current AWS region
  // Reranking improves result relevance but is only available in specific regions
  if (reranking && !rerankingSupportedRegions.includes(clientRegion)) {
    logger.warn(`Reranking is not supported in region ${clientRegion}`);
    rerankingEnabled = false;
  }

  // Configure retrieval request with vector search parameters
  const retrieveRequest: KnowledgeBaseRetrievalConfiguration = {
    vectorSearchConfiguration: {
      numberOfResults,
    },
  };

  // Add reranking configuration if enabled and supported
  // Reranking uses a separate model to reorder results by relevance
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
  const documents: QueryKnowledgeBasesOutput[] = [];

  for (const result of results) {
    if (result.content?.type === "IMAGE") {
      logger.warn("Images are not supported at this time. Skipping...");
      continue;
    } else if (result.content?.text) {
      documents.push({
        content: result.content.text,
        location: resolveToWebsiteUrl(result.location),
        score: result.score || -1.0,
      });
    }
  }

  return serializeResults(documents);
}

/**
 * Resolves an S3 location from a knowledge base result to a public website URL.
 * This method converts S3 URIs to publicly accessible URLs based on specific rules.
 * If the location is not an S3 URI, it returns the original location.
 *
 * @param location The original location object from the retrieval result.
 * @returns A new location object with a `WEB` type and a URL, or the original location if no conversion is needed.
 */
export function resolveToWebsiteUrl(
  location?: RetrievalResultLocation,
): RetrievalResultLocation | undefined {
  if (!location) {
    return undefined;
  }

  // If the location is an S3 URI, convert it to a dx.pagopa.it URL.
  if (
    typeof location === "object" &&
    location.type === "S3" &&
    location.s3Location?.uri
  ) {
    // The uri format is: s3://bucket/key
    const match = location.s3Location.uri.match(/^s3:\/\/(?:[^/]+)\/(.+)$/);
    if (match) {
      const key = match[1];
      let url = "";
      // Special case: llms-full.txt or llms.txt should be returned as https://dx.pagopa.it/<file>
      if (key === "llms-full.txt" || key === "llms.txt") {
        url = `https://dx.pagopa.it/${key}`;
      }
      // Special case: if key starts with blog/, return https://dx.pagopa.it/blog/
      else if (key.startsWith("blog/")) {
        url = "https://dx.pagopa.it/blog/";
      }
      // If the key ends with /index.md, return the directory with trailing slash
      else if (key.endsWith("/index.md")) {
        url = `https://dx.pagopa.it/docs/${key.replace(/\/index\.md$/, "")}/`;
      }
      // Otherwise, remove .md and return the documentation path
      else {
        url = `https://dx.pagopa.it/docs/${key.replace(/\.md$/, "")}`;
      }
      // Return a RetrievalResultLocation object of type WEB with the computed URL
      return {
        type: "WEB",
        webLocation: {
          url,
        },
      };
    }
  } else {
    // If not S3, return the original location (e.g. WEB, SHAREPOINT, etc.)
    return location;
  }

  // If unable to determine the URL, return undefined
  return undefined;
}

/**
 * Serializes an array of knowledge base query results into a formatted string.
 * This method formats the results for better readability, including content, location, and score.
 *
 * Example:
 * Input:
 * ```json
 * [
 *   { "content": "Result 1 content", "location": { "webLocation": { "url": "https://example.com" } }, "score": 0.95 },
 *   { "content": "Result 2 content", "location": null, "score": 0.85 }
 * ]
 * ```
 *
 * Output:
 * ```
 * Result 1 (Score: 0.9500):
 * Result 1 content
 * Location: https://example.com
 *
 * Result 2 (Score: 0.8500):
 * Result 2 content
 * Location: undefined
 * ```
 */
function serializeResults(results: QueryKnowledgeBasesOutput[]): string {
  return results
    .map((result, index) => {
      let locationStr = "";
      if (
        result.location &&
        typeof result.location === "object" &&
        "webLocation" in result.location &&
        result.location.webLocation?.url
      ) {
        locationStr = result.location.webLocation.url;
      } else if (result.location) {
        locationStr = JSON.stringify(result.location);
      }
      return `Result ${index + 1} (Score: ${result.score.toFixed(4)}):\n${
        result.content
      }\nLocation: ${locationStr}\n`;
    })
    .join("\n\n");
}
