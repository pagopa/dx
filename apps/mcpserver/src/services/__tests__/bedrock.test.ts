import { getLogger } from "@logtape/logtape";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  queryKnowledgeBase,
  queryKnowledgeBaseStructured,
} from "../bedrock.js";

// Helper to create mock Bedrock client
function createMockBedrockClient(sendMock: ReturnType<typeof vi.fn>) {
  return {
    config: {
      apiVersion: "2023-11-20",
      region: async () => "eu-central-1",
      requestHandler: { handle: vi.fn() },
    },
    destroy: vi.fn(),
    middlewareStack: {},
    send: sendMock,
  } as unknown as import("@aws-sdk/client-bedrock-agent-runtime").BedrockAgentRuntimeClient;
}

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

describe("queryKnowledgeBaseStructured - Basic Functionality", () => {
  let loggerSpy: {
    warn: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    const logger = getLogger(["mcpserver", "bedrock"]);
    loggerSpy = {
      warn: vi.spyOn(logger, "warn"),
    };
  });

  it("should return structured QueryKnowledgeBasesOutput[] instead of a string", async () => {
    const mockClient = createMockBedrockClient(
      vi.fn().mockResolvedValue({
        retrievalResults: [
          {
            content: { text: "Documentation content", type: "TEXT" },
            location: {
              s3Location: { uri: "s3://bucket/docs/guide.md" },
              type: "S3",
            },
            score: 0.95,
          },
        ],
      }),
    );

    const result = await queryKnowledgeBaseStructured(
      "kbId",
      "query",
      mockClient,
      5,
      false,
    );

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(typeof result[0]).toBe("object");
  });

  it("should return result objects with content, location, and score properties", async () => {
    const mockClient = createMockBedrockClient(
      vi.fn().mockResolvedValue({
        retrievalResults: [
          {
            content: { text: "Test content", type: "TEXT" },
            location: {
              s3Location: { uri: "s3://bucket/path/file.md" },
              type: "S3",
            },
            score: 0.87,
          },
        ],
      }),
    );

    const result = await queryKnowledgeBaseStructured(
      "kbId",
      "test query",
      mockClient,
    );

    expect(result[0]).toHaveProperty("content");
    expect(result[0]).toHaveProperty("location");
    expect(result[0]).toHaveProperty("score");
    expect(result[0].content).toBe("Test content");
    expect(result[0].score).toBe(0.87);
  });

  it("should resolve S3 locations to website URLs via resolveToWebsiteUrl", async () => {
    const mockClient = createMockBedrockClient(
      vi.fn().mockResolvedValue({
        retrievalResults: [
          {
            content: { text: "Content", type: "TEXT" },
            location: {
              s3Location: {
                uri: "s3://pagopa-dx-documentation/docs/azure/index.md",
              },
              type: "S3",
            },
            score: 0.9,
          },
        ],
      }),
    );

    const result = await queryKnowledgeBaseStructured(
      "kbId",
      "query",
      mockClient,
    );

    // resolveToWebsiteUrl should transform S3 URI to website URL
    expect(result[0].location).toBeDefined();
    if (result[0].location?.webLocation?.url) {
      expect(result[0].location.webLocation.url).toContain("https://");
      // URL should have /index removed
      expect(result[0].location.webLocation.url).not.toContain("/index");
    }
  });

  it("should skip image content with warning logs", async () => {
    const mockClient = createMockBedrockClient(
      vi.fn().mockResolvedValue({
        retrievalResults: [
          {
            content: { text: "Valid text content", type: "TEXT" },
            location: {
              s3Location: { uri: "s3://bucket/file.md" },
              type: "S3",
            },
            score: 0.9,
          },
          {
            content: { type: "IMAGE" },
            location: {
              s3Location: { uri: "s3://bucket/image.png" },
              type: "S3",
            },
            score: 0.85,
          },
        ],
      }),
    );

    const result = await queryKnowledgeBaseStructured(
      "kbId",
      "query",
      mockClient,
    );

    expect(result.length).toBe(1);
    expect(result[0].content).toBe("Valid text content");
    expect(loggerSpy.warn).toHaveBeenCalledWith(
      "Images are not supported at this time. Skipping...",
    );
  });
});

describe("queryKnowledgeBaseStructured - Reranking", () => {
  let loggerSpy: {
    warn: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    const logger = getLogger(["mcpserver", "bedrock"]);
    loggerSpy = {
      warn: vi.spyOn(logger, "warn"),
    };
  });

  it("should apply reranking configuration when enabled in supported region", async () => {
    const sendSpy = vi.fn().mockResolvedValue({
      retrievalResults: [
        {
          content: { text: "Reranked content", type: "TEXT" },
          location: { s3Location: { uri: "s3://bucket/doc.md" }, type: "S3" },
          score: 0.98,
        },
      ],
    });

    const mockClient = createMockBedrockClient(sendSpy);
    // Override region for this test
    mockClient.config.region = async () => "us-east-1"; // Supported region

    await queryKnowledgeBaseStructured(
      "kbId",
      "query",
      mockClient,
      5,
      true, // Enable reranking
      "AMAZON",
    );

    // Verify that send was called with reranking configuration
    const commandArg = sendSpy.mock.calls[0][0];
    expect(commandArg.input.retrievalConfiguration).toBeDefined();
    expect(
      commandArg.input.retrievalConfiguration.vectorSearchConfiguration
        .rerankingConfiguration,
    ).toBeDefined();
    expect(
      commandArg.input.retrievalConfiguration.vectorSearchConfiguration
        .rerankingConfiguration.bedrockRerankingConfiguration.modelConfiguration
        .modelArn,
    ).toContain("amazon.rerank-v1:0");
  });

  it("should disable reranking in unsupported region with warning", async () => {
    const sendSpy = vi.fn().mockResolvedValue({
      retrievalResults: [],
    });

    const mockClient = createMockBedrockClient(sendSpy);
    // Override region for this test
    mockClient.config.region = async () => "ap-southeast-1"; // Unsupported region

    await queryKnowledgeBaseStructured(
      "kbId",
      "query",
      mockClient,
      5,
      true, // Try to enable reranking
    );

    expect(loggerSpy.warn).toHaveBeenCalledWith(
      "Reranking is not supported in region ap-southeast-1",
    );

    // Verify that send was called WITHOUT reranking configuration
    const commandArg = sendSpy.mock.calls[0][0];
    expect(
      commandArg.input.retrievalConfiguration.vectorSearchConfiguration
        .rerankingConfiguration,
    ).toBeUndefined();
  });
});
