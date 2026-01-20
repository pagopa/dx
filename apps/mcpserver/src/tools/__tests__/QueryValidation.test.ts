import { describe, expect, it } from "vitest";

import { QueryPagoPADXDocumentationInputSchema } from "../query-pagopa-dx-documentation.js";

// Test the Zod schema validation used in the tools
describe("Query Validation", () => {
  // Use the actual schema from QueryPagoPADXDocumentationTool
  const queryDocSchema = QueryPagoPADXDocumentationInputSchema;

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
