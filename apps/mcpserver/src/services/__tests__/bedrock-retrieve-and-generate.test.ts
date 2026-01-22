import { getLogger } from "@logtape/logtape";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { retrieveAndGenerate } from "../bedrock-retrieve-and-generate.js";

describe("retrieveAndGenerate", () => {
  let loggerSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    const logger = getLogger([
      "mcpserver",
      "bedrock",
      "retrieve-and-generate",
    ]);

    loggerSpy = {
      debug: vi.spyOn(logger, "debug"),
      error: vi.spyOn(logger, "error"),
      info: vi.spyOn(logger, "info"),
    };
  });

  it("should successfully retrieve and generate with valid parameters", async () => {
    const mockResponse = {
      output: {
        text: "This is the AI-generated answer based on the knowledge base.",
      },
      sessionId: "test-session-123",
      citations: [
        {
          retrievedReferences: [
            {
              content: { text: "Reference content" },
              location: {
                s3Location: { uri: "s3://bucket/doc.md" },
                type: "S3",
              },
            },
          ],
        },
      ],
    };

    const mockClient = {
      config: {
        apiVersion: "2023-11-20",
        region: async () => "eu-central-1",
        requestHandler: { handle: vi.fn() },
      },
      destroy: vi.fn(),
      middlewareStack: {},
      send: vi.fn().mockResolvedValue(mockResponse),
    } as unknown as import("@aws-sdk/client-bedrock-agent-runtime").BedrockAgentRuntimeClient;

    const result = await retrieveAndGenerate(
      "kb-test-id",
      "arn:aws:bedrock:eu-central-1::foundation-model/amazon.nova-2-lite-v1:0",
      "How do I setup Terraform?",
      mockClient,
      5,
    );

    expect(result).toEqual(mockResponse);
    expect(result.output?.text).toBe(
      "This is the AI-generated answer based on the knowledge base.",
    );
    expect(result.sessionId).toBe("test-session-123");

    expect(loggerSpy.debug).toHaveBeenCalledWith("Calling RetrieveAndGenerate", {
      knowledgeBaseId: "kb-test-id",
      modelArn:
        "arn:aws:bedrock:eu-central-1::foundation-model/amazon.nova-2-lite-v1:0",
      numberOfResults: 5,
      query: "How do I setup Terraform?",
    });

    expect(loggerSpy.info).toHaveBeenCalledWith(
      "RetrieveAndGenerate successful",
      {
        sessionId: "test-session-123",
      },
    );
  });

  it("should use default numberOfResults when not provided", async () => {
    const mockClient = {
      config: {
        apiVersion: "2023-11-20",
        region: async () => "eu-central-1",
        requestHandler: { handle: vi.fn() },
      },
      destroy: vi.fn(),
      middlewareStack: {},
      send: vi.fn().mockResolvedValue({
        output: { text: "Answer" },
        sessionId: "session-456",
      }),
    } as unknown as import("@aws-sdk/client-bedrock-agent-runtime").BedrockAgentRuntimeClient;

    await retrieveAndGenerate(
      "kb-id",
      "model-arn",
      "test query",
      mockClient,
      // numberOfResults defaults to 5
    );

    expect(loggerSpy.debug).toHaveBeenCalledWith(
      "Calling RetrieveAndGenerate",
      expect.objectContaining({
        numberOfResults: 5,
      }),
    );
  });

  it("should log error details and rethrow on failure", async () => {
    const mockError = {
      $metadata: {
        httpStatusCode: 403,
      },
      __type: "AccessDeniedException",
      message: "User is not authorized to perform: bedrock:RetrieveAndGenerate",
      name: "AccessDeniedException",
    };

    const mockClient = {
      config: {
        apiVersion: "2023-11-20",
        region: async () => "eu-central-1",
        requestHandler: { handle: vi.fn() },
      },
      destroy: vi.fn(),
      middlewareStack: {},
      send: vi.fn().mockRejectedValue(mockError),
    } as unknown as import("@aws-sdk/client-bedrock-agent-runtime").BedrockAgentRuntimeClient;

    await expect(
      retrieveAndGenerate("kb-id", "model-arn", "test query", mockClient),
    ).rejects.toThrow();

    expect(loggerSpy.error).toHaveBeenCalledWith(
      expect.stringContaining("RetrieveAndGenerate failed"),
    );
    expect(loggerSpy.error).toHaveBeenCalledWith(
      expect.stringContaining("AccessDeniedException"),
    );
    expect(loggerSpy.error).toHaveBeenCalledWith(
      expect.stringContaining("kb-id"),
    );
    expect(loggerSpy.error).toHaveBeenCalledWith(
      expect.stringContaining("model-arn"),
    );
    expect(loggerSpy.error).toHaveBeenCalledWith(
      expect.stringContaining("403"),
    );
  });

  it("should handle errors without $metadata or __type", async () => {
    const mockError = new Error("Network timeout");

    const mockClient = {
      config: {
        apiVersion: "2023-11-20",
        region: async () => "eu-central-1",
        requestHandler: { handle: vi.fn() },
      },
      destroy: vi.fn(),
      middlewareStack: {},
      send: vi.fn().mockRejectedValue(mockError),
    } as unknown as import("@aws-sdk/client-bedrock-agent-runtime").BedrockAgentRuntimeClient;

    await expect(
      retrieveAndGenerate("kb-id", "model-arn", "test query", mockClient),
    ).rejects.toThrow("Network timeout");

    expect(loggerSpy.error).toHaveBeenCalledWith(
      expect.stringContaining("RetrieveAndGenerate failed"),
    );
    expect(loggerSpy.error).toHaveBeenCalledWith(
      expect.stringContaining("Error"),
    );
    expect(loggerSpy.error).toHaveBeenCalledWith(
      expect.stringContaining("Network timeout"),
    );
  });

  it("should send correct RetrieveAndGenerateCommand configuration", async () => {
    const sendSpy = vi.fn().mockResolvedValue({
      output: { text: "Test answer" },
      sessionId: "test-session",
    });

    const mockClient = {
      config: {
        apiVersion: "2023-11-20",
        region: async () => "eu-central-1",
        requestHandler: { handle: vi.fn() },
      },
      destroy: vi.fn(),
      middlewareStack: {},
      send: sendSpy,
    } as unknown as import("@aws-sdk/client-bedrock-agent-runtime").BedrockAgentRuntimeClient;

    await retrieveAndGenerate(
      "kb-test-id",
      "arn:aws:bedrock:eu-central-1::foundation-model/test-model",
      "What is the capital of France?",
      mockClient,
      10,
    );

    const commandArg = sendSpy.mock.calls[0][0];

    expect(commandArg.input.input.text).toBe("What is the capital of France?");
    expect(
      commandArg.input.retrieveAndGenerateConfiguration.type,
    ).toBe("KNOWLEDGE_BASE");
    expect(
      commandArg.input.retrieveAndGenerateConfiguration
        .knowledgeBaseConfiguration.knowledgeBaseId,
    ).toBe("kb-test-id");
    expect(
      commandArg.input.retrieveAndGenerateConfiguration
        .knowledgeBaseConfiguration.modelArn,
    ).toBe("arn:aws:bedrock:eu-central-1::foundation-model/test-model");
    expect(
      commandArg.input.retrieveAndGenerateConfiguration
        .knowledgeBaseConfiguration.retrievalConfiguration
        .vectorSearchConfiguration.numberOfResults,
    ).toBe(10);
  });
});
