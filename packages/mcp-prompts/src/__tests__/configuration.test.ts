// Tests for prompts directory configuration functionality.

import { describe, expect, it } from "vitest";

import { resolvePromptsDirectory } from "../utils/markdown-loader.js";

describe("Prompts Directory Configuration", () => {
  describe("resolvePromptsDirectory", () => {
    it("should always return the default prompts directory within package", () => {
      const result = resolvePromptsDirectory();

      // Should resolve to a path ending with prompts and containing src
      expect(result).toMatch(/prompts$/);
      expect(result).toContain("src");
    });
  });
});
