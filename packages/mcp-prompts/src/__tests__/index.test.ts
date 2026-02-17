import { beforeEach, describe, expect, it, vi } from "vitest";

import * as promptsModule from "../index.js";

describe("mcp-prompts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPrompts", () => {
    it("loads prompts from Markdown sources", async () => {
      const result = await promptsModule.getPrompts();

      // Should load Markdown prompts from the default directory
      expect(result.length).toBeGreaterThan(0);

      // Check that known Markdown prompts are included
      const expectedPromptIds = [
        "generate-terraform-configuration",
        "migrate-terraform-module",
        "resolve-security-findings",
      ];

      const foundPrompts = result.filter((p) =>
        expectedPromptIds.includes(p.id),
      );

      expect(foundPrompts.length).toBeGreaterThan(0);
    });

    it("injects version into all prompts", async () => {
      const result = await promptsModule.getPrompts();

      expect(result.length).toBeGreaterThan(0);
      result.forEach((prompt) => {
        expect(prompt.version).toBeDefined();
        expect(typeof prompt.version).toBe("string");
      });
    });

    it("loads prompts with proper structure", async () => {
      const result = await promptsModule.getPrompts();

      expect(result.length).toBeGreaterThan(0);

      // Check that prompts have the expected structure
      result.forEach((prompt) => {
        expect(prompt).toHaveProperty("id");
        expect(prompt).toHaveProperty("category");
        expect(prompt).toHaveProperty("enabled");
        expect(prompt).toHaveProperty("metadata");
        expect(prompt).toHaveProperty("prompt");
        expect(prompt).toHaveProperty("tags");
        expect(prompt).toHaveProperty("version");
      });
    });
  });

  describe("getEnabledPrompts", () => {
    it("returns only enabled prompts", async () => {
      const result = await promptsModule.getEnabledPrompts();

      expect(result.length).toBeGreaterThan(0);

      // All should be enabled
      result.forEach((prompt) => {
        expect(prompt.enabled).toBe(true);
      });
    });

    it("includes version in enabled prompts", async () => {
      const result = await promptsModule.getEnabledPrompts();

      expect(result.length).toBeGreaterThan(0);
      result.forEach((prompt) => {
        expect(prompt.version).toBeDefined();
        expect(typeof prompt.version).toBe("string");
      });
    });

    it("filters out disabled prompts", async () => {
      const allPrompts = await promptsModule.getPrompts();
      const enabledPrompts = await promptsModule.getEnabledPrompts();

      // If there are any disabled prompts, enabled should be fewer than total
      const disabledCount = allPrompts.filter((p) => !p.enabled).length;

      if (disabledCount > 0) {
        expect(enabledPrompts.length).toBeLessThan(allPrompts.length);
      } else {
        expect(enabledPrompts.length).toBe(allPrompts.length);
      }
    });
  });
});
