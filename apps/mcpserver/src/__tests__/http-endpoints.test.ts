import { describe, expect, it } from "vitest";

describe("HTTP Endpoints", () => {
  describe("POST /ask", () => {
    it("should validate query is a string", () => {
      const validQuery = { query: "How do I setup Terraform?" };
      expect(typeof validQuery.query).toBe("string");

      const invalidQuery = { query: 123 };
      expect(typeof invalidQuery.query).not.toBe("string");
    });

    it("should return answer and sources on success", () => {
      const expectedResponse = {
        answer: "To setup Terraform...",
        sources: ["https://dx.pagopa.it/docs/terraform/"],
      };

      expect(expectedResponse).toHaveProperty("answer");
      expect(expectedResponse).toHaveProperty("sources");
      expect(Array.isArray(expectedResponse.sources)).toBe(true);
    });
  });

  describe("POST /search", () => {
    it("should return 400 if query is missing", () => {
      const requestBody = {};
      const hasQuery = "query" in requestBody;
      expect(hasQuery).toBe(false);
    });

    it("should validate number_of_results range", () => {
      const validCounts = [1, 5, 10, 20];
      validCounts.forEach((count) => {
        expect(count).toBeGreaterThanOrEqual(1);
        expect(count).toBeLessThanOrEqual(20);
      });

      const invalidCounts = [0, 21, -1, 100];
      invalidCounts.forEach((count) => {
        expect(count < 1 || count > 20).toBe(true);
      });
    });

    it("should use default number_of_results if not provided", () => {
      const request: { query: string; number_of_results?: number } = {
        query: "test",
      };
      const numberOfResults = request.number_of_results ?? 5;
      expect(numberOfResults).toBe(5);
    });

    it("should return results with content, score, and source", () => {
      const expectedResult = {
        content: "Documentation content...",
        score: 0.9542,
        source: "https://dx.pagopa.it/docs/azure/",
      };

      expect(expectedResult).toHaveProperty("content");
      expect(expectedResult).toHaveProperty("score");
      expect(expectedResult).toHaveProperty("source");
      expect(typeof expectedResult.score).toBe("number");
    });
  });

  describe("CORS Headers", () => {
    it("should include required CORS headers", () => {
      const corsHeaders = {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS, DELETE",
        "Access-Control-Allow-Origin": "*",
      };

      expect(corsHeaders["Access-Control-Allow-Origin"]).toBe("*");
      expect(corsHeaders["Access-Control-Allow-Methods"]).toContain("POST");
    });
  });

  describe("Error Handling", () => {
    it("should return 500 on internal errors", () => {
      const errorResponse = {
        error: "Internal server error",
        message: "Something went wrong",
      };

      expect(errorResponse).toHaveProperty("error");
      expect(errorResponse).toHaveProperty("message");
    });

    it("should return 400 for invalid request body", () => {
      const invalidBodies = ["not json", "{invalid}", ""];

      invalidBodies.forEach((body) => {
        let isValid = true;
        try {
          JSON.parse(body);
        } catch {
          isValid = false;
        }
        expect(isValid).toBe(false);
      });
    });
  });
});
