import type { BedrockAgentRuntimeClient } from "@aws-sdk/client-bedrock-agent-runtime";
import type { IncomingMessage, ServerResponse } from "node:http";

import { getLogger } from "@logtape/logtape";
import { z } from "zod";

import type { AppConfig } from "../config.js";

import { retrieveAndGenerate } from "../services/bedrock-retrieve-and-generate.js";
import { resolveToWebsiteUrl } from "../services/bedrock.js";
import {
  parseJsonBody,
  sendErrorResponse,
  sendJsonResponse,
} from "../utils/http.js";

const AskBodySchema = z.object({
  query: z.string().trim().min(1, "Missing required field: query"),
});

export async function handleAskEndpoint(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
  kbRuntimeClient: BedrockAgentRuntimeClient,
): Promise<void> {
  const logger = getLogger(["mcpserver", "handler", "ask"]);
  logger.debug("Handling /ask endpoint");
  try {
    const jsonBody = await parseJsonBody(req);
    const result = AskBodySchema.safeParse(jsonBody);

    if (!result.success) {
      return sendErrorResponse(res, 400, result.error.errors[0].message);
    }

    const { query } = result.data;

    const response = await retrieveAndGenerate(
      config.aws.knowledgeBaseId,
      config.aws.modelArn,
      query,
      kbRuntimeClient,
    );

    // Extract unique source URLs from citations
    const sourceUrls = new Set<string>();
    response.citations?.forEach((citation) => {
      citation.retrievedReferences?.forEach((ref) => {
        const webLocation = resolveToWebsiteUrl(ref.location);
        if (webLocation?.webLocation?.url) {
          sourceUrls.add(webLocation.webLocation.url);
        }
      });
    });

    sendJsonResponse(res, 200, {
      answer: response.output?.text || "",
      sources: Array.from(sourceUrls),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error handling /ask request: ${errorMessage}`);
    sendErrorResponse(res, 500, "Internal server error", {
      message: errorMessage,
    });
  }
}
