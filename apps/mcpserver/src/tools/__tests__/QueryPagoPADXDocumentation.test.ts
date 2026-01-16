import { describe, expect, it, vi } from "vitest";
vi.mock("../../services/bedrock", () => ({
  queryKnowledgeBase: vi.fn().mockResolvedValue("mocked result"),
}));
import { BedrockAgentRuntimeClient } from "@aws-sdk/client-bedrock-agent-runtime";

import { createQueryPagoPADXDocumentationTool } from "../QueryPagoPADXDocumentation.js";

const QueryPagoPADXDocumentationTool = createQueryPagoPADXDocumentationTool({
  kbRuntimeClient: new BedrockAgentRuntimeClient({ region: "eu-central-1" }),
  knowledgeBaseId: "mockKbId",
  rerankingEnabled: false,
});

describe("QueryPagoPADXDocumentationTool", () => {
  it("should return results from the knowledge base", async () => {
    const args = { format: "markdown", query: "test query" };
    const result = await QueryPagoPADXDocumentationTool.execute(args);
    expect(result).toBe("mocked result");
  });

  it("should use default format if not provided", async () => {
    const args = { query: "test query" };
    const result = await QueryPagoPADXDocumentationTool.execute(args);
    expect(result).toBe("mocked result");
  });

  it("should reject unknown parameters due to strict schema", async () => {
    const args = { query: "test query", unknownParam: "value" };
    const result = await QueryPagoPADXDocumentationTool.execute(args);
    expect(result).toContain("Error: Invalid input");
    expect(result).toContain("Unrecognized key");
  });

  it("should reject queries shorter than 3 characters", async () => {
    const args = { query: "ab" };
    const result = await QueryPagoPADXDocumentationTool.execute(args);
    expect(result).toContain("Error: Invalid input");
    expect(result).toContain("Query must be at least 3 characters");
  });

  it("should reject empty queries", async () => {
    const args = { query: "" };
    const result = await QueryPagoPADXDocumentationTool.execute(args);
    expect(result).toContain("Error: Invalid input");
    expect(result).toContain("Query must be at least 3 characters");
  });

  it("should reject queries exceeding 500 characters", async () => {
    const args = { query: "a".repeat(501) };
    const result = await QueryPagoPADXDocumentationTool.execute(args);
    expect(result).toContain("Error: Invalid input");
    expect(result).toContain("Query must not exceed 500 characters");
  });
});
