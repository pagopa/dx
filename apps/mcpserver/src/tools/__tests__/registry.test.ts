import { BedrockAgentRuntimeClient } from "@aws-sdk/client-bedrock-agent-runtime";
import { describe, expect, it } from "vitest";

import { createToolDefinitions } from "../registry.js";

const toolDefinitions = createToolDefinitions({
  aws: {
    knowledgeBaseId: "kb-id",
    region: "eu-central-1",
    rerankingEnabled: false,
  },
  githubSearchOrg: "pagopa",
  kbRuntimeClient: new BedrockAgentRuntimeClient({ region: "eu-central-1" }),
});

describe("Tool Registry", () => {
  describe("registry structure", () => {
    it("should contain expected tools", () => {
      expect(toolDefinitions).toHaveLength(2);

      const toolIds = toolDefinitions.map((entry) => entry.id);
      expect(toolIds).toContain("pagopa_query_documentation");
      expect(toolIds).toContain("pagopa_search_github_code");
    });

    it("should have unique tool IDs", () => {
      const toolIds = toolDefinitions.map((entry) => entry.id);
      const uniqueIds = new Set(toolIds);
      expect(uniqueIds.size).toBe(toolIds.length);
    });

    it("should follow snake_case naming convention with pagopa prefix", () => {
      for (const entry of toolDefinitions) {
        expect(entry.id).toMatch(/^pagopa_[a-z_]+$/);
      }
    });
  });

  describe("tool entries", () => {
    it("should have valid tool definitions", () => {
      for (const entry of toolDefinitions) {
        expect(entry.tool).toBeDefined();
        expect(entry.tool.name).toBeTruthy();
        expect(entry.tool.description).toBeTruthy();
        expect(entry.tool.execute).toBeTypeOf("function");
        expect(entry.tool.parameters).toBeDefined();
      }
    });

    it("should have proper annotations", () => {
      for (const entry of toolDefinitions) {
        expect(entry.tool.annotations).toBeDefined();
        expect(entry.tool.annotations.title).toBeTruthy();
      }
    });

    it("should have boolean values for hint annotations when defined", () => {
      for (const entry of toolDefinitions) {
        const { annotations } = entry.tool;
        if (annotations.readOnlyHint !== undefined) {
          expect(annotations.readOnlyHint).toBeTypeOf("boolean");
        }
        if (annotations.destructiveHint !== undefined) {
          expect(annotations.destructiveHint).toBeTypeOf("boolean");
        }
        if (annotations.idempotentHint !== undefined) {
          expect(annotations.idempotentHint).toBeTypeOf("boolean");
        }
        if (annotations.openWorldHint !== undefined) {
          expect(annotations.openWorldHint).toBeTypeOf("boolean");
        }
      }
    });
  });

  describe("session requirements", () => {
    it("should mark documentation tool as not requiring session", () => {
      const docTool = toolDefinitions.find(
        (entry) => entry.id === "pagopa_query_documentation",
      );
      expect(docTool?.requiresSession).toBe(false);
    });

    it("should mark GitHub search tool as requiring session", () => {
      const githubTool = toolDefinitions.find(
        (entry) => entry.id === "pagopa_search_github_code",
      );
      expect(githubTool?.requiresSession).toBe(true);
    });
  });

  describe("pagopa_query_documentation", () => {
    const docTool = toolDefinitions.find(
      (entry) => entry.id === "pagopa_query_documentation",
    );

    it("should have correct metadata", () => {
      expect(docTool?.tool.name).toBe("pagopa_query_documentation");
      expect(docTool?.tool.annotations.readOnlyHint).toBe(true);
      expect(docTool?.tool.annotations.destructiveHint).toBe(false);
      expect(docTool?.tool.annotations.idempotentHint).toBe(true);
    });
  });

  describe("pagopa_search_github_code", () => {
    const githubTool = toolDefinitions.find(
      (entry) => entry.id === "pagopa_search_github_code",
    );

    it("should have correct metadata", () => {
      expect(githubTool?.tool.name).toBe("pagopa_search_github_code");
      expect(githubTool?.tool.annotations.readOnlyHint).toBe(true);
      expect(githubTool?.tool.annotations.destructiveHint).toBe(false);
      expect(githubTool?.tool.annotations.openWorldHint).toBe(true);
    });
  });
});
