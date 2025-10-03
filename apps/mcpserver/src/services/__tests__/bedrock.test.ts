import { describe, it, expect, vi } from "vitest";
vi.mock("../../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));
import { queryKnowledgeBase } from "../bedrock.js";

describe("queryKnowledgeBase", () => {
  it("should skip images in results", async () => {
    const mockClient = {
      config: {
        region: async () => "eu-central-1",
        requestHandler: { handle: vi.fn() },
        apiVersion: "2023-11-20",
      },
      send: vi.fn().mockResolvedValue({
        retrievalResults: [
          { content: { type: "IMAGE" } },
          { content: { type: "TEXT", text: "doc1" } },
        ],
      }),
      destroy: vi.fn(),
      middlewareStack: {},
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
        region: async () => "unsupported-region",
        requestHandler: { handle: vi.fn() },
        apiVersion: "2023-11-20",
      },
      send: vi.fn().mockResolvedValue({ retrievalResults: [] }),
      destroy: vi.fn(),
      middlewareStack: {},
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
