import { beforeEach, describe, expect, it, vi } from "vitest";

import * as promptsModule from "../index.js";

// Mock the prompts index to control test data
vi.mock("../prompts/index.js", () => ({
  prompts: [
    {
      category: "terraform",
      enabled: true,
      id: "test-prompt",
      metadata: { title: "Test" },
      prompt: { name: "test" },
      tags: [],
    },
    {
      category: "terraform",
      enabled: false,
      id: "disabled-prompt",
      metadata: { title: "Disabled" },
      prompt: { name: "disabled" },
      tags: [],
    },
    {
      category: "azure",
      enabled: true,
      id: "azure-prompt",
      metadata: { title: "Azure" },
      prompt: { name: "azure" },
      tags: [],
    },
  ],
}));

describe("mcp-prompts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    promptsModule._resetCache();
  });

  describe("getEnabledPrompts", () => {
    it("returns only enabled prompts", async () => {
      const result = await promptsModule.getEnabledPrompts();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("test");
      expect(result[1].name).toBe("azure");
    });
  });

  describe("getPromptById", () => {
    it("returns prompt when found", async () => {
      const result = await promptsModule.getPromptById("test-prompt");

      expect(result?.id).toBe("test-prompt");
      expect(result?.category).toBe("terraform");
    });

    it("returns undefined when not found", async () => {
      const result = await promptsModule.getPromptById("nonexistent");

      expect(result).toBeUndefined();
    });
  });

  describe("getPromptsByCategory", () => {
    it("returns enabled prompts from category", async () => {
      const result = await promptsModule.getPromptsByCategory("terraform");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("test-prompt");
    });

    it("returns empty array for category with no enabled prompts", async () => {
      const result = await promptsModule.getPromptsByCategory("nonexistent");

      expect(result).toHaveLength(0);
    });
  });

  describe("promptsCatalog", () => {
    it("throws error when accessing prompts directly", () => {
      expect(() => promptsModule.promptsCatalog.prompts).toThrow(
        "Use getPrompts() instead of promptsCatalog.prompts",
      );
    });
  });
});
