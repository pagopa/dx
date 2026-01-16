import { describe, expect, it } from "vitest";

import { QueryPagoPADXDocumentationInputSchema } from "../QueryPagoPADXDocumentation.js";
import { SearchGitHubCodeInputSchema } from "../SearchGitHubCode.js";

// Test the Zod schema validation used in the tools
describe("Query Validation", () => {
  // Use the actual schema from QueryPagoPADXDocumentationTool
  const queryDocSchema = QueryPagoPADXDocumentationInputSchema;

  // Use the actual schema from SearchGitHubCodeTool
  const searchGitHubSchema = SearchGitHubCodeInputSchema;

  describe("QueryPagoPADXDocumentationTool validation", () => {
    it("should accept valid queries", () => {
      const validQueries = [
        { query: "How do I set up the project?" },
        { query: "abc" }, // minimum 3 characters
        { query: "What is the DX CLI?" },
        { query: "Terraform Azure provider setup" },
      ];

      validQueries.forEach((input) => {
        const result = queryDocSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it("should reject queries shorter than 3 characters", () => {
      const shortQueries = [{ query: "" }, { query: "a" }, { query: "ab" }];

      shortQueries.forEach((input) => {
        const result = queryDocSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe(
            "Query must be at least 3 characters",
          );
        }
      });
    });

    it("should reject queries exceeding 500 characters", () => {
      const longQuery = { query: "a".repeat(501) };
      const result = queryDocSchema.safeParse(longQuery);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(
          "Query must not exceed 500 characters",
        );
      }
    });

    it("should reject missing query field", () => {
      const missingQuery = {};
      const result = queryDocSchema.safeParse(missingQuery);

      expect(result.success).toBe(false);
    });

    it("should reject non-string query values", () => {
      const invalidTypes = [
        { query: 123 },
        { query: null },
        { query: undefined },
        { query: [] },
        { query: {} },
      ];

      invalidTypes.forEach((input) => {
        const result = queryDocSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("SearchGitHubCodeTool validation", () => {
    it("should accept valid code search queries", () => {
      const validSearches = [
        { query: "azure-function-app" },
        { extension: "tf", query: "pagopa-dx/azure-function-app/azurerm" },
        { extension: "tf", query: "terraform module usage" },
        { query: "api management config" },
      ];

      validSearches.forEach((input) => {
        const result = searchGitHubSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it("should reject empty code search queries", () => {
      const emptyQuery = { query: "" };
      const result = searchGitHubSchema.safeParse(emptyQuery);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Query cannot be empty");
      }
    });

    it("should reject queries exceeding 500 characters", () => {
      const longQuery = { query: "a".repeat(501) };
      const result = searchGitHubSchema.safeParse(longQuery);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Query too long");
      }
    });

    it("should accept queries without optional extension", () => {
      const queryWithoutExt = { query: "some search term" };
      const result = searchGitHubSchema.safeParse(queryWithoutExt);

      expect(result.success).toBe(true);
    });

    it("should accept queries with optional extension", () => {
      const queryWithExt = { extension: "tf", query: "terraform config" };
      const result = searchGitHubSchema.safeParse(queryWithExt);

      expect(result.success).toBe(true);
    });

    it("should reject invalid extension types", () => {
      const invalidExt = { extension: 123, query: "test" };
      const result = searchGitHubSchema.safeParse(invalidExt);

      expect(result.success).toBe(false);
    });

    it("should reject missing query field", () => {
      const missingQuery = { extension: "tf" };
      const result = searchGitHubSchema.safeParse(missingQuery);

      expect(result.success).toBe(false);
    });

    it("should reject non-string query values", () => {
      const invalidQueries = [
        { query: 123 },
        { query: null },
        { query: undefined },
        { query: [] },
      ];

      invalidQueries.forEach((input) => {
        const result = searchGitHubSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    it("should provide helpful error messages for validation failures", () => {
      const emptyQuery = { query: "" };
      const result = searchGitHubSchema.safeParse(emptyQuery);

      if (!result.success) {
        const errorMessage = result.error.errors[0].message;
        expect(errorMessage).toBe("Query cannot be empty");
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle queries with special characters", () => {
      const specialCharQueries = [
        { query: "api/management@v1" },
        { query: "terraform-module (azure-app-service)" },
        { query: "query with 'quotes' and \"double quotes\"" },
      ];

      specialCharQueries.forEach((input) => {
        const result = queryDocSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it("should handle very long query strings within limit", () => {
      const longQuery = { query: "a".repeat(500) }; // exactly at limit
      const result = queryDocSchema.safeParse(longQuery);

      expect(result.success).toBe(true);
    });

    it("should accept whitespace-only strings if they meet min length", () => {
      // Note: The Zod schema doesn't call .trim(), so whitespace-only strings will be accepted
      // if they meet the minimum length requirement (3 characters for queryDoc)
      const whitespaceOnly = { query: "   " }; // 3 spaces = 3 characters
      const result = queryDocSchema.safeParse(whitespaceOnly);

      // Whitespace-only string has length >= 3, so it passes
      expect(result.success).toBe(true);
    });
  });
});
