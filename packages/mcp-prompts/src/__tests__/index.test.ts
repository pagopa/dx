import { beforeEach, describe, expect, it, vi } from "vitest";

import * as promptsModule from "../index.js";
import * as loader from "../prompts/loader.js";

vi.mock("../prompts/loader.js");

describe("mcp-prompts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    promptsModule._resetCache();
  });

  it("Call loader.loadPromptsand return value", async () => {
    const mockPrompts = [
      { enabled: true, id: "test", name: "Test", prompt: { name: "Test" } },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(loader.loadPrompts).mockResolvedValue(mockPrompts as any);
    const result = await promptsModule.getEnabledPrompts();
    expect(loader.loadPrompts).toHaveBeenCalledWith();
    expect(result).toEqual([{ name: "Test" }]);
  });

  describe("getEnabledPrompts", () => {
    it("returns only enabled prompts", async () => {
      const mockPrompts = [
        {
          enabled: true,
          id: "enabled-prompt",
          prompt: { name: "enabled" },
        },
        {
          enabled: false,
          id: "disabled-prompt",
          prompt: { name: "disabled" },
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(loader.loadPrompts).mockResolvedValue(mockPrompts as any);

      const result = await promptsModule.getEnabledPrompts();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("enabled");
    });
  });

  describe("getPromptById", () => {
    it("returns prompt when found", async () => {
      const mockPrompts = [
        { id: "test-prompt", name: "Test Prompt" },
        { id: "other-prompt", name: "Other Prompt" },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(loader.loadPrompts).mockResolvedValue(mockPrompts as any);

      const result = await promptsModule.getPromptById("test-prompt");

      expect(result).toEqual({ id: "test-prompt", name: "Test Prompt" });
    });

    it("returns undefined when not found", async () => {
      vi.mocked(loader.loadPrompts).mockResolvedValue([]);

      const result = await promptsModule.getPromptById("nonexistent");

      expect(result).toBeUndefined();
    });
  });

  describe("getPromptsByCategory", () => {
    it("returns enabled prompts from category", async () => {
      const mockPrompts = [
        { category: "terraform", enabled: true, id: "tf1" },
        { category: "terraform", enabled: false, id: "tf2" },
        { category: "azure", enabled: true, id: "az1" },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(loader.loadPrompts).mockResolvedValue(mockPrompts as any);

      const result = await promptsModule.getPromptsByCategory("terraform");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("tf1");
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
