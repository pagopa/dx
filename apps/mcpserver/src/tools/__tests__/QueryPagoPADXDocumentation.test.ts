import { describe, expect, it, vi } from "vitest";

// Mock services and config
vi.mock("../../services/bedrock", () => ({
  queryKnowledgeBase: vi.fn().mockResolvedValue("mocked result"),
}));
vi.mock("../../config/aws", () => ({
  kbRerankingEnabled: false,
  kbRuntimeClient: "mockClient",
  knowledgeBaseId: "mockKbId",
}));

// Mock the decorator to pass through the executor without modifications
vi.mock("../../decorators/toolUsageMonitoring", () => ({
  withToolLogging: vi.fn(
    (_toolName: string, executor: (...args: unknown[]) => unknown) => executor,
  ),
}));

import {
  QueryDocsInputSchema,
  QueryPagoPADXDocumentationTool,
} from "../QueryPagoPADXDocumentation.js";

describe("QueryPagoPADXDocumentationTool", () => {
  it("should validate input schema correctly", () => {
    const validInput = { query: "test query" };
    expect(() => QueryDocsInputSchema.parse(validInput)).not.toThrow();

    const invalidInput = { invalid: "field" };
    expect(() => QueryDocsInputSchema.parse(invalidInput)).toThrow();
  });

  it("should return results from the knowledge base via handler", async () => {
    const tool = new QueryPagoPADXDocumentationTool();
    const args = { query: "test query" };
    const result = await tool.handler(args);

    expect(result).toMatchObject({
      content: [
        {
          text: "mocked result",
          type: "text",
        },
      ],
    });
  });

  it("should have correct tool definition", () => {
    const tool = new QueryPagoPADXDocumentationTool();

    expect(tool.definition.name).toBe("QueryPagoPADXTerraformDocumentation");
    expect(tool.definition.inputSchema).toBe(QueryDocsInputSchema);
    expect(tool.definition.title).toBeTruthy();
    expect(tool.definition.description).toBeTruthy();
  });
});
