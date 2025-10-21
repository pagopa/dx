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
  });

  describe("getPrompts", () => {
    it("returns all prompts including disabled ones", async () => {
      const result = await promptsModule.getPrompts();

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("test-prompt");
      expect(result[1].id).toBe("disabled-prompt");
      expect(result[2].id).toBe("azure-prompt");
    });

    it("injects version into all prompts", async () => {
      const result = await promptsModule.getPrompts();

      expect(result).toHaveLength(3);
      result.forEach((prompt) => {
        expect(prompt.version).toBeDefined();
        expect(typeof prompt.version).toBe("string");
      });
    });
  });

  describe("getEnabledPrompts", () => {
    it("returns only enabled prompts", async () => {
      const result = await promptsModule.getEnabledPrompts();

      expect(result).toHaveLength(2);
      expect(result[0].prompt.name).toBe("test");
      expect(result[1].prompt.name).toBe("azure");
    });

    it("returns empty array when no prompts are enabled", async () => {
      // Mock with all disabled prompts
      vi.resetModules();
      vi.doMock("../prompts/index.js", () => ({
        prompts: [
          {
            category: "terraform",
            enabled: false,
            id: "disabled-1",
            metadata: { title: "Disabled 1" },
            prompt: { name: "disabled1" },
            tags: [],
          },
          {
            category: "azure",
            enabled: false,
            id: "disabled-2",
            metadata: { title: "Disabled 2" },
            prompt: { name: "disabled2" },
            tags: [],
          },
        ],
      }));

      const module = await import("../index.js");
      const result = await module.getEnabledPrompts();

      expect(result).toHaveLength(0);
    });

    it("includes version in enabled prompts", async () => {
      const result = await promptsModule.getEnabledPrompts();

      expect(result).toHaveLength(2);
      result.forEach((prompt) => {
        expect(prompt.version).toBeDefined();
        expect(typeof prompt.version).toBe("string");
      });
    });
  });
});
