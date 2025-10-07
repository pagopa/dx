import {
  BedrockAgentRuntimeClient,
  KnowledgeBaseRetrievalConfiguration,
  RetrievalResultLocation,
  RetrieveCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

import { logger } from "../utils/logger.js";

export type QueryKnowledgeBasesOutput = {
  content: string;
  location?: RetrievalResultLocation;
  score: number;
};

type RerankingModelName = "AMAZON" | "COHERE";

export async function queryKnowledgeBase(
  knowledgeBaseId: string,
  query: string,
  kbAgentClient: BedrockAgentRuntimeClient,
  numberOfResults = 5,
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

export function resolveToWebsiteUrl(
  location?: RetrievalResultLocation,
): RetrievalResultLocation | undefined {
  if (!location) {
    return undefined;
  }

  // If the location is of type S3 and contains a uri, convert the S3 key to a dx.pagopa.it website URL
  if (
    typeof location === "object" &&
    location.type === "S3" &&
    location.s3Location?.uri
  ) {
    // The uri format is: s3://bucket/key
    const match = location.s3Location.uri.match(/^s3:\/[^/]+\/(.+)$/);
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
