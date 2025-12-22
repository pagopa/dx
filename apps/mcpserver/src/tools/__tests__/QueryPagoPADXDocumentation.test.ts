import { describe, expect, it, vi } from "vitest";
vi.mock("../../services/bedrock", () => ({
  queryKnowledgeBase: vi.fn().mockResolvedValue("mocked result"),
}));
vi.mock("../../config/aws", () => ({
  kbRerankingEnabled: false,
  kbRuntimeClient: "mockClient",
  knowledgeBaseId: "mockKbId",
}));
import { executeQueryPagoPADXDocumentation } from "../QueryPagoPADXDocumentation.js";

describe("QueryPagoPADXDocumentationTool", () => {
  it("should return results from the knowledge base", async () => {
    const args = { query: "test query" };
    const result = await executeQueryPagoPADXDocumentation(args);
    expect(result).toMatchObject({
      content: [
        {
          text: "mocked result",
          type: "text",
        },
      ],
    });
  });

  it("should handle query without number_of_results", async () => {
    const args = { query: "test query" };
    const result = await executeQueryPagoPADXDocumentation(args);
    expect(result).toMatchObject({
      content: [
        {
          text: "mocked result",
          type: "text",
        },
      ],
    });
  });
});
