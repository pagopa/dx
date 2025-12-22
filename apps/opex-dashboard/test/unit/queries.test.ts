/**
 * Unit tests for query templates.
 */

import { describe, expect, it } from "vitest";

import {
  availabilityQuery,
  responseCodesQuery,
  responseTimeQuery,
} from "@/builders/queries/api-management.js";
import {
  availabilityQuery as appGwAvailabilityQuery,
  responseCodesQuery as appGwResponseCodesQuery,
  responseTimeQuery as appGwResponseTimeQuery,
} from "@/builders/queries/app-gateway.js";

describe("API Management Queries", () => {
  const baseCtx = {
    actionGroupsIds: ["ag1"],
    dataSourceId: "ds1",
    endpoint: "/users",
    endpoints: {},
    hosts: ["api.example.com"],
    location: "eastus",
    name: "test",
    queries: {
      responseTimePercentile: 95,
      statusCodeCategories: ["1XX", "2XX", "3XX", "4XX", "5XX"],
    },
    resourceType: "api-management",
    timespan: "5m",
  };

  describe("availabilityQuery", () => {
    it("should generate availability query for dashboard", () => {
      const ctx = { ...baseCtx, isAlarm: false };
      const result = availabilityQuery(ctx);

      expect(result).toContain("let threshold = 0.99");
      expect(result).toContain("render timechart");
      expect(result).toContain("availability");
    });

    it("should generate availability query for alarm", () => {
      const ctx = { ...baseCtx, isAlarm: true, threshold: 0.95 };
      const result = availabilityQuery(ctx);

      expect(result).toContain("let threshold = 0.95");
      expect(result).toContain("where availability < threshold");
      expect(result).not.toContain("render timechart");
    });
  });

  describe("responseCodesQuery", () => {
    it("should generate response codes query", () => {
      const result = responseCodesQuery(baseCtx);

      expect(result).toContain("HTTPStatus");
      expect(result).toContain("render areachart");
      expect(result).toContain("1XX");
      expect(result).toContain("5XX");
    });
  });

  describe("responseTimeQuery", () => {
    it("should generate response time query for dashboard", () => {
      const ctx = { ...baseCtx, isAlarm: false };
      const result = responseTimeQuery(ctx);

      expect(result).toContain("let threshold = 1");
      expect(result).toContain("render timechart");
      expect(result).toContain("duration_percentile_95");
    });

    it("should generate response time query for alarm", () => {
      const ctx = { ...baseCtx, isAlarm: true, threshold: 2 };
      const result = responseTimeQuery(ctx);

      expect(result).toContain("let threshold = 2");
      expect(result).toContain("where duration_percentile_95 > threshold");
      expect(result).not.toContain("render timechart");
    });
  });
});

describe("App Gateway Queries", () => {
  const baseCtx = {
    actionGroupsIds: ["ag1"],
    dataSourceId: "ds1",
    endpoint: "/users",
    endpoints: {},
    hosts: ["api.example.com"],
    location: "eastus",
    name: "test",
    queries: {
      responseTimePercentile: 95,
      statusCodeCategories: ["1XX", "2XX", "3XX", "4XX", "5XX"],
    },
    resourceType: "app-gateway",
    timespan: "5m",
  };

  describe("availabilityQuery", () => {
    it("should generate availability query for dashboard", () => {
      const ctx = { ...baseCtx, isAlarm: false };
      const result = appGwAvailabilityQuery(ctx);

      expect(result).toContain("let threshold = 0.99");
      expect(result).toContain("render timechart");
    });

    it("should generate availability query for alarm", () => {
      const ctx = { ...baseCtx, isAlarm: true, threshold: 0.95 };
      const result = appGwAvailabilityQuery(ctx);

      expect(result).toContain("let threshold = 0.95");
      expect(result).toContain("where availability < threshold");
    });
  });

  describe("responseCodesQuery", () => {
    it("should generate response codes query", () => {
      const result = appGwResponseCodesQuery(baseCtx);

      expect(result).toContain("render areachart");
      expect(result).toContain("httpStatus");
    });
  });

  describe("responseTimeQuery", () => {
    it("should generate response time query for dashboard", () => {
      const ctx = { ...baseCtx, isAlarm: false };
      const result = appGwResponseTimeQuery(ctx);

      expect(result).toContain("render timechart");
    });

    it("should generate response time query for alarm", () => {
      const ctx = { ...baseCtx, isAlarm: true, threshold: 2 };
      const result = appGwResponseTimeQuery(ctx);

      expect(result).toContain("where duration_percentile_95 > threshold");
    });
  });
});
