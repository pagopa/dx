import { describe, expect, it, vi } from "vitest";
vi.mock("../../services/bedrock", () => ({
  queryKnowledgeBase: vi.fn().mockResolvedValue("mocked result"),
}));
vi.mock("../../config/aws", () => ({
  kbRerankingEnabled: false,
  kbRuntimeClient: "mockClient",
  knowledgeBaseId: "mockKbId",
}));
import { QueryPagoPADXDocumentationTool } from "../QueryPagoPADXDocumentation.js";

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
});
