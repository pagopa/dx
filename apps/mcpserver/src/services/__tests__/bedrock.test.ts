import { describe, expect, it, vi } from "vitest";
vi.mock("../../utils/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));
import { queryKnowledgeBase } from "../bedrock.js";

describe("queryKnowledgeBase", () => {
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
  });
});
