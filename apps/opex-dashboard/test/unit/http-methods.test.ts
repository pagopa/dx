/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines-per-function */
/**
 * Unit tests for HTTP method-specific filtering.
 */

import { describe, expect, it } from "vitest";

import * as apiManagement from "@/builders/queries/api-management.js";
import * as appGateway from "@/builders/queries/app-gateway.js";

describe("HTTP Methods - Query Generation", () => {
  describe("App Gateway queries", () => {
    it("should include method filter when method is specified", () => {
      const endpoint = "/api/v1/services/{service_id}";
      const props = {
        api_hosts: ["app-backend.io.italia.it"],
        endpoint,
        endpoints: {
          [endpoint]: {
            method: "GET",
            path: endpoint,
          },
        },
        isAlarm: false,
        threshold: 0.99,
      };

      const query = appGateway.availabilityQuery(props as any);

      expect(query).toContain('| where httpMethod_s == "GET"');
      expect(query).toContain("/api/v1/services/[^/]+$");
    });

    it("should not include method filter when method is not specified", () => {
      const endpoint = "/api/v1/services/{service_id}";
      const props = {
        api_hosts: ["app-backend.io.italia.it"],
        endpoint,
        endpoints: {
          [endpoint]: {},
        },
        isAlarm: false,
        threshold: 0.99,
      };

      const query = appGateway.availabilityQuery(props as any);

      expect(query).not.toContain("httpMethod_s");
      expect(query).toContain("/api/v1/services/[^/]+$");
    });

    it("should include method filter in response codes query", () => {
      const endpoint = "/api/v1/services";
      const props = {
        api_hosts: ["app-backend.io.italia.it"],
        endpoint,
        endpoints: {
          [endpoint]: {
            method: "POST",
            path: endpoint,
          },
        },
      };

      const query = appGateway.responseCodesQuery(props as any);

      expect(query).toContain('| where httpMethod_s == "POST"');
    });

    it("should include method filter in response time query", () => {
      const endpoint = "/api/v1/services/{service_id}";
      const props = {
        api_hosts: ["app-backend.io.italia.it"],
        endpoint,
        endpoints: {
          [endpoint]: {
            method: "PUT",
            path: endpoint,
          },
        },
        isAlarm: false,
        threshold: 1.0,
      };

      const query = appGateway.responseTimeQuery(props as any);

      expect(query).toContain('| where httpMethod_s == "PUT"');
    });

    it("should handle different HTTP methods", () => {
      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];

      methods.forEach((method) => {
        const endpoint = "/api/v1/services";
        const props = {
          api_hosts: ["app-backend.io.italia.it"],
          endpoint,
          endpoints: {
            [endpoint]: {
              method,
              path: endpoint,
            },
          },
          isAlarm: false,
          threshold: 0.99,
        };

        const query = appGateway.availabilityQuery(props as any);
        expect(query).toContain(`| where httpMethod_s == "${method}"`);
      });
    });
  });

  describe("API Management queries", () => {
    it("should include method filter when method is specified", () => {
      const endpoint = "/api/v1/services/{service_id}";
      const props = {
        api_hosts: ["my-api"],
        endpoint,
        endpoints: {
          [endpoint]: {
            method: "GET",
            path: endpoint,
          },
        },
        isAlarm: false,
        threshold: 0.99,
      };

      const query = apiManagement.availabilityQuery(props as any);

      expect(query).toContain('| where method_s == "GET"');
      expect(query).toContain("/api/v1/services/[^/]+$");
    });

    it("should not include method filter when method is not specified", () => {
      const endpoint = "/api/v1/services/{service_id}";
      const props = {
        api_hosts: ["my-api"],
        endpoint,
        endpoints: {
          [endpoint]: {},
        },
        isAlarm: false,
        threshold: 0.99,
      };

      const query = apiManagement.availabilityQuery(props as any);

      expect(query).not.toContain("method_s");
    });

    it("should include method filter in response codes query", () => {
      const endpoint = "/api/v1/services";
      const props = {
        api_hosts: ["my-api"],
        endpoint,
        endpoints: {
          [endpoint]: {
            method: "DELETE",
            path: endpoint,
          },
        },
      };

      const query = apiManagement.responseCodesQuery(props as any);

      expect(query).toContain('| where method_s == "DELETE"');
    });

    it("should include method filter in response time query", () => {
      const endpoint = "/api/v1/services/{service_id}";
      const props = {
        api_hosts: ["my-api"],
        endpoint,
        endpoints: {
          [endpoint]: {
            method: "PATCH",
            path: endpoint,
          },
        },
        isAlarm: false,
        threshold: 1.0,
      };

      const query = apiManagement.responseTimeQuery(props as any);

      expect(query).toContain('| where method_s == "PATCH"');
    });

    it("should use responseCode_d != 0 filter in availability query", () => {
      const endpoint = "/api/v1/services";
      const props = {
        api_hosts: ["my-api"],
        endpoint,
        endpoints: {
          [endpoint]: {
            method: "GET",
            path: endpoint,
          },
        },
        isAlarm: false,
        threshold: 0.99,
      };

      const query = apiManagement.availabilityQuery(props as any);

      expect(query).toContain("responseCode_d < 500 and responseCode_d != 0");
    });
  });

  describe("Query compatibility", () => {
    it("should work without method for backward compatibility", () => {
      const endpointAppGateway = "/api/v1/services";
      const endpointApiMgmt = "/api/v1/services";

      const propsAppGateway = {
        api_hosts: ["app-backend.io.italia.it"],
        endpoint: endpointAppGateway,
        endpoints: {
          [endpointAppGateway]: {},
        },
        isAlarm: false,
        threshold: 0.99,
      };

      const propsApiMgmt = {
        api_hosts: ["my-api"],
        endpoint: endpointApiMgmt,
        endpoints: {
          [endpointApiMgmt]: {},
        },
        isAlarm: false,
        threshold: 0.99,
      };

      // Should generate valid queries without method
      expect(() =>
        appGateway.availabilityQuery(propsAppGateway as any),
      ).not.toThrow();
      expect(() =>
        appGateway.responseCodesQuery(propsAppGateway as any),
      ).not.toThrow();
      expect(() =>
        appGateway.responseTimeQuery(propsAppGateway as any),
      ).not.toThrow();

      expect(() =>
        apiManagement.availabilityQuery(propsApiMgmt as any),
      ).not.toThrow();
      expect(() =>
        apiManagement.responseCodesQuery(propsApiMgmt as any),
      ).not.toThrow();
      expect(() =>
        apiManagement.responseTimeQuery(propsApiMgmt as any),
      ).not.toThrow();
    });
  });
});
