import { describe, expect, it } from "vitest";

import { API_TIMEOUT, DEFAULT_PAGE_SIZE, MAX_RESULTS } from "../constants.js";

describe("Server Constants", () => {
  describe("API_TIMEOUT", () => {
    it("should be a positive number", () => {
      expect(API_TIMEOUT).toBeGreaterThan(0);
    });

    it("should be 30 seconds (30000ms)", () => {
      expect(API_TIMEOUT).toBe(30000);
    });
  });

  describe("MAX_RESULTS", () => {
    it("should be a positive number", () => {
      expect(MAX_RESULTS).toBeGreaterThan(0);
    });

    it("should be 100", () => {
      expect(MAX_RESULTS).toBe(100);
    });
  });

  describe("DEFAULT_PAGE_SIZE", () => {
    it("should be a positive number", () => {
      expect(DEFAULT_PAGE_SIZE).toBeGreaterThan(0);
    });

    it("should be 20", () => {
      expect(DEFAULT_PAGE_SIZE).toBe(20);
    });

    it("should be less than MAX_RESULTS", () => {
      expect(DEFAULT_PAGE_SIZE).toBeLessThan(MAX_RESULTS);
    });
  });
});
