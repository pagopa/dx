import { describe, it, expect, vi } from "vitest";
vi.mock("../../services/bedrock", () => ({
  queryKnowledgeBase: vi.fn().mockResolvedValue("mocked result"),
}));
vi.mock("../../config/aws", () => ({
  kbRuntimeClient: "mockClient",
  kbRerankingEnabled: false,
  knowledgeBaseId: "mockKbId",
}));
import { QueryPagoPADXDocumentationTool } from "../QueryPagoPADXDocumentation.js";

describe("QueryPagoPADXDocumentationTool", () => {
  it("should return results from the knowledge base", async () => {
    const args = { query: "test query", number_of_results: 3 };
    const result = await QueryPagoPADXDocumentationTool.execute(args);
    expect(result).toBe("mocked result");
  });

  it("should use default number_of_results if not provided", async () => {
    const args = { query: "test query" };
    const result = await QueryPagoPADXDocumentationTool.execute(args);
    expect(result).toBe("mocked result");
  });
});
