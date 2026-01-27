import type { BedrockAgentRuntimeClient } from "@aws-sdk/client-bedrock-agent-runtime";
import type { IncomingMessage, ServerResponse } from "node:http";

import { getLogger } from "@logtape/logtape";
import { z } from "zod";

import type { AppConfig } from "../config.js";

import { queryKnowledgeBaseStructured } from "../services/bedrock.js";
import {
  parseJsonBody,
  sendErrorResponse,
  sendJsonResponse,
} from "../utils/http.js";

const SearchBodySchema = z.object({
  number_of_results: z
    .number({
      invalid_type_error: "number_of_results must be between 1 and 20",
    })
    .int()
    .min(1, "number_of_results must be between 1 and 20")
    .max(20, "number_of_results must be between 1 and 20")
    .optional()
    .default(5),
  query: z
    .string({
      invalid_type_error: "Missing required field: query",
      required_error: "Missing required field: query",
    })
    .trim()
    .min(1, "Missing required field: query"),
});

export async function handleSearchEndpoint(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
  kbRuntimeClient: BedrockAgentRuntimeClient,
): Promise<void> {
  const logger = getLogger(["mcpserver", "handler", "search"]);
  logger.debug("Handling /search endpoint");
  try {
    let jsonBody;
    try {
      jsonBody = await parseJsonBody(req);
    } catch (error) {
      return sendErrorResponse(res, 400, "Invalid JSON in request body");
    }
    const result = SearchBodySchema.safeParse(jsonBody);

    if (!result.success) {
      return sendErrorResponse(res, 400, result.error.errors[0].message);
    }

    const { number_of_results: numberOfResults, query } = result.data;

    const results = await queryKnowledgeBaseStructured(
      config.aws.knowledgeBaseId,
      query,
      kbRuntimeClient,
      numberOfResults,
      config.aws.rerankingEnabled,
    );

    // Format results with content, score, and source URL
    const formattedResults = results.map((result) => ({
      content: result.content,
      score: result.score,
      source:
        result.location?.type === "WEB"
          ? result.location.webLocation?.url
          : undefined,
    }));

    sendJsonResponse(res, 200, {
      query,
      results: formattedResults,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error handling /search request: ${errorMessage}`);
    sendErrorResponse(res, 500, "Internal server error", {
      message: errorMessage,
    });
  }
}
