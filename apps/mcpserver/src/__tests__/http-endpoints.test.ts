import type { Server } from "node:http";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { loadConfig } from "../config.js";

// Helper to create mock Bedrock responses
function createMockBedrockResponse(command: { constructor: { name: string } }) {
  if (command.constructor.name === "RetrieveAndGenerateCommand") {
    return Promise.resolve({
      citations: [
        {
          retrievedReferences: [
            {
              content: { text: "Reference content", type: "TEXT" },
              location: {
                s3Location: {
                  uri: "s3://bucket/docs/terraform/setup.md",
                },
                type: "S3",
              },
            },
          ],
        },
      ],
      output: { text: "This is how you setup Terraform." },
      sessionId: "test-session",
    });
  } else if (command.constructor.name === "RetrieveCommand") {
    return Promise.resolve({
      retrievalResults: [
        {
          content: { text: "Azure naming conventions guide", type: "TEXT" },
          location: {
            s3Location: { uri: "s3://bucket/docs/azure/naming.md" },
            type: "S3",
          },
          score: 0.95,
        },
      ],
    });
  }
  return Promise.resolve({});
}

// Mock AWS SDK to avoid external dependencies
vi.mock("@aws-sdk/client-bedrock-agent-runtime", () => ({
  BedrockAgentRuntimeClient: vi.fn().mockImplementation(() => ({
    config: {
      apiVersion: "2023-11-20",
      region: async () => "eu-central-1",
      requestHandler: { handle: vi.fn() },
    },
    destroy: vi.fn(),
    middlewareStack: {},
    send: vi.fn(),
  })),
  RetrieveAndGenerateCommand: vi.fn(),
  RetrieveCommand: vi.fn(),
}));

vi.mock("../config/aws.js", () => ({
  createBedrockRuntimeClient: vi.fn(() => ({
    config: {
      apiVersion: "2023-11-20",
      region: async () => "eu-central-1",
      requestHandler: { handle: vi.fn() },
    },
    destroy: vi.fn(),
    middlewareStack: {},
    send: vi.fn().mockImplementation(createMockBedrockResponse),
  })),
  rerankingSupportedRegions: ["us-east-1", "eu-central-1"],
}));

// Shared server instance
let server: Server;
let baseUrl: string;

async function closeTestServer() {
  return new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
}

async function setupTestServer() {
  const testEnv = {
    AWS_BEDROCK_KNOWLEDGE_BASE_ID: "test-kb-id",
    AWS_BEDROCK_MODEL_ARN: "arn:aws:bedrock:test",
    AWS_REGION: "eu-central-1",
    LOG_LEVEL: "error",
    NODE_ENV: "test",
  };

  const config = loadConfig(testEnv);
  const { startHttpServer } = await import("../index.js");
  const { getEnabledPrompts } = await import("@pagopa/dx-mcpprompts");

  const enabledPrompts = await getEnabledPrompts();
  server = await startHttpServer(config, enabledPrompts);

  const address = server.address();
  const port = typeof address === "object" ? address?.port : 8080;
  baseUrl = `http://localhost:${port}`;
}

describe("HTTP Endpoints Integration Tests", () => {
  beforeAll(setupTestServer);
  afterAll(closeTestServer);

  describe("POST /ask", () => {
    it("should return 200 with answer and sources for valid request", async () => {
      const response = await fetch(`${baseUrl}/ask`, {
        body: JSON.stringify({ query: "How do I setup Terraform?" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );

      const data = (await response.json()) as {
        answer: string;
        sources: string[];
      };
      expect(data).toHaveProperty("answer");
      expect(data).toHaveProperty("sources");
      expect(typeof data.answer).toBe("string");
      expect(Array.isArray(data.sources)).toBe(true);
    });

    it("should return 400 for missing query field", async () => {
      const response = await fetch(`${baseUrl}/ask`, {
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as { error: string };
      expect(data.error).toBe("Missing required field: query");
    });

    it("should return 400 for empty query string", async () => {
      const response = await fetch(`${baseUrl}/ask`, {
        body: JSON.stringify({ query: "   " }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as { error: string };
      expect(data.error).toBe("Missing required field: query");
    });

    it("should return 400 for invalid JSON", async () => {
      const response = await fetch(`${baseUrl}/ask`, {
        body: "not valid json{",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as { error: string };
      expect(data.error).toBe("Invalid JSON in request body");
    });

    it("should return 400 for non-string query", async () => {
      const response = await fetch(`${baseUrl}/ask`, {
        body: JSON.stringify({ query: 123 }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as { error: string };
      expect(data.error).toBe("Missing required field: query");
    });
  });

  describe("POST /search", () => {
    it("should return 200 with results for valid request", async () => {
      const response = await fetch(`${baseUrl}/search`, {
        body: JSON.stringify({ query: "Azure naming conventions" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );

      const data = (await response.json()) as {
        query: string;
        results: { content: string; score: number; source?: string }[];
      };
      expect(data).toHaveProperty("query");
      expect(data).toHaveProperty("results");
      expect(Array.isArray(data.results)).toBe(true);

      if (data.results.length > 0) {
        const result = data.results[0];
        expect(result).toHaveProperty("content");
        expect(result).toHaveProperty("score");
        expect(typeof result.score).toBe("number");
      }
    });

    it("should use default number_of_results when not provided", async () => {
      const response = await fetch(`${baseUrl}/search`, {
        body: JSON.stringify({ query: "test query" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(200);
      const data = (await response.json()) as { results: unknown[] };
      expect(data).toHaveProperty("results");
    });

    it("should accept custom number_of_results", async () => {
      const response = await fetch(`${baseUrl}/search`, {
        body: JSON.stringify({ number_of_results: 10, query: "test query" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(200);
    });

    it("should return 400 for missing query field", async () => {
      const response = await fetch(`${baseUrl}/search`, {
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as { error: string };
      expect(data.error).toBe("Missing required field: query");
    });

    it("should return 400 for empty query string", async () => {
      const response = await fetch(`${baseUrl}/search`, {
        body: JSON.stringify({ query: "" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as { error: string };
      expect(data.error).toBe("Missing required field: query");
    });

    it("should return 400 for invalid JSON", async () => {
      const response = await fetch(`${baseUrl}/search`, {
        body: "{invalid json",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as { error: string };
      expect(data.error).toBe("Invalid JSON in request body");
    });

    it("should return 400 for number_of_results out of range (too low)", async () => {
      const response = await fetch(`${baseUrl}/search`, {
        body: JSON.stringify({ number_of_results: 0, query: "test" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as { error: string };
      expect(data.error).toBe("number_of_results must be between 1 and 20");
    });

    it("should return 400 for number_of_results out of range (too high)", async () => {
      const response = await fetch(`${baseUrl}/search`, {
        body: JSON.stringify({ number_of_results: 21, query: "test" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as { error: string };
      expect(data.error).toBe("number_of_results must be between 1 and 20");
    });
  });
});
