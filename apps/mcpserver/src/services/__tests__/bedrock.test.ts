import { getLogger } from "@logtape/logtape";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryKnowledgeBase } from "../bedrock.js";

describe("queryKnowledgeBase", () => {
  let loggerSpy: {
    warn: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Get logger and spy on its methods - no need for special configuration
    const logger = getLogger(["mcpserver", "bedrock"]);

    loggerSpy = {
      warn: vi.spyOn(logger, "warn"),
    };
  });
  it("should skip images in results", async () => {
    const mockClient = {
      config: {
        apiVersion: "2023-11-20",
        region: async () => "eu-central-1",
        requestHandler: { handle: vi.fn() },
      },
      destroy: vi.fn(),
      middlewareStack: {},
      send: vi.fn().mockResolvedValue({
        retrievalResults: [
          { content: { text: "doc1", type: "TEXT" } },
          { content: { type: "IMAGE" } },
        ],
      }),
    } as unknown as import("@aws-sdk/client-bedrock-agent-runtime").BedrockAgentRuntimeClient;
    const result = await queryKnowledgeBase(
      "kbId",
      "query",
      mockClient,
      2,
      false,
    );
    expect(result).toContain("doc1");
    expect(loggerSpy.warn).toHaveBeenCalledWith(
      "Images are not supported at this time. Skipping...",
    );
  });

  it("should warn if reranking is not supported in region", async () => {
    const mockClient = {
      config: {
        apiVersion: "2023-11-20",
        region: async () => "unsupported-region",
        requestHandler: { handle: vi.fn() },
      },
      destroy: vi.fn(),
      middlewareStack: {},
      send: vi.fn().mockResolvedValue({ retrievalResults: [] }),
    } as unknown as import("@aws-sdk/client-bedrock-agent-runtime").BedrockAgentRuntimeClient;
    const result = await queryKnowledgeBase(
      "kbId",
      "query",
      mockClient,
      2,
      true,
    );
    expect(typeof result).toBe("string");
    expect(loggerSpy.warn).toHaveBeenCalledWith(
      "Reranking is not supported in region unsupported-region",
    );
  });
});
