/**
 * Unit tests for utility functions.
 */

import { describe, expect, it } from "vitest";

import { normalizeEndpointKeys, parseEndpointKey } from "@/utils/index.js";
import { overrideWith } from "@/utils/merge.js";

describe("overrideWith", () => {
  it("should merge simple objects", () => {
    const base = { a: 1, b: 2 };
    const override = { b: 3, c: 4 };
    const result = overrideWith(base, override);

    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("should merge nested objects", () => {
    const base = { a: { x: 1, y: 2 } };
    const override = { a: { y: 3, z: 4 } };
    const result = overrideWith(base, override);

    expect(result).toEqual({ a: { x: 1, y: 3, z: 4 } });
  });

  it("should handle arrays by replacement", () => {
    const base = { a: [1, 2, 3] };
    const override = { a: [4, 5] };
    const result = overrideWith(base, override);

    expect(result).toEqual({ a: [4, 5] });
  });

  it("should not mutate original objects", () => {
    const base = { a: 1, b: { c: 2 } };
    const override = { b: { d: 3 } };
    const result = overrideWith(base, override);

    expect(base).toEqual({ a: 1, b: { c: 2 } });
    expect(override).toEqual({ b: { d: 3 } });
    expect(result).toEqual({ a: 1, b: { c: 2, d: 3 } });
  });

  it("should handle empty overrides", () => {
    const base = { a: 1, b: 2 };
    const result = overrideWith(base, {});

    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("should handle null values", () => {
    const base = { a: 1, b: 2 };
    const override = { b: null };
    const result = overrideWith(base, override);

    expect(result).toEqual({ a: 1, b: null });
  });

  it("should replace arrays", () => {
    const base = { a: [1, 2] };
    const override = { a: [3, 4] };
    const result = overrideWith(base, override);

    expect(result).toEqual({ a: [3, 4] });
  });

  it("should handle non-plain objects", () => {
    const base = { a: 1 };
    const override = { a: new Date() };
    const result = overrideWith(base, override);

    expect(result.a).toBeInstanceOf(Date);
  });
});

describe("normalizeEndpointKeys", () => {
  it("should normalize 'METHOD /path' format to path-only keys", () => {
    const endpoints = {
      "GET /users": { availabilityThreshold: 95 },
      "POST /users": { availabilityThreshold: 98 },
    };

    const result = normalizeEndpointKeys(endpoints);

    expect(result).toEqual({
      "/users": { availabilityThreshold: 98, method: "POST" },
    });
  });

  it("should keep path-only keys unchanged", () => {
    const endpoints = {
      "/posts": { availabilityThreshold: 98 },
      "/users": { availabilityThreshold: 95 },
    };

    const result = normalizeEndpointKeys(endpoints);

    expect(result).toEqual({
      "/posts": { availabilityThreshold: 98 },
      "/users": { availabilityThreshold: 95 },
    });
  });

  it("should handle mixed formats", () => {
    const endpoints = {
      "/posts": { availabilityThreshold: 98 },
      "DELETE /comments": { availabilityThreshold: 99 },
      "GET /users": { availabilityThreshold: 95 },
    };

    const result = normalizeEndpointKeys(endpoints);

    expect(result).toEqual({
      "/comments": { availabilityThreshold: 99, method: "DELETE" },
      "/posts": { availabilityThreshold: 98 },
      "/users": { availabilityThreshold: 95, method: "GET" },
    });
  });

  it("should preserve existing method property and override with key method", () => {
    const endpoints = {
      "GET /users": { availabilityThreshold: 95, method: "POST" },
    };

    const result = normalizeEndpointKeys(endpoints);

    expect(result).toEqual({
      "/users": { availabilityThreshold: 95, method: "GET" },
    });
  });

  it("should handle empty endpoints object", () => {
    const endpoints = {};

    const result = normalizeEndpointKeys(endpoints);

    expect(result).toEqual({});
  });

  it("should handle paths with multiple spaces", () => {
    const endpoints = {
      "GET /user data": { availabilityThreshold: 95 },
    };

    const result = normalizeEndpointKeys(endpoints);

    expect(result).toEqual({
      "/user data": { availabilityThreshold: 95, method: "GET" },
    });
  });

  it("should handle all HTTP methods", () => {
    const endpoints = {
      "DELETE /users": { availabilityThreshold: 99 },
      "GET /users": { availabilityThreshold: 95 },
      "PATCH /users": { availabilityThreshold: 98 },
      "POST /users": { availabilityThreshold: 96 },
      "PUT /users": { availabilityThreshold: 97 },
    };

    const result = normalizeEndpointKeys(endpoints);

    // Last one wins (PUT)
    expect(result).toEqual({
      "/users": { availabilityThreshold: 97, method: "PUT" },
    });
  });
});

describe("parseEndpointKey", () => {
  it("should parse 'METHOD /path' format", () => {
    const result = parseEndpointKey("GET /users");

    expect(result).toEqual({
      hasMethod: true,
      method: "GET",
      path: "/users",
    });
  });

  it("should parse plain '/path' format", () => {
    const result = parseEndpointKey("/users");

    expect(result).toEqual({
      hasMethod: false,
      method: "",
      path: "/users",
    });
  });

  it("should handle path with query parameters", () => {
    const result = parseEndpointKey("POST /users?limit=10");

    expect(result).toEqual({
      hasMethod: true,
      method: "POST",
      path: "/users?limit=10",
    });
  });

  it("should handle path with multiple spaces", () => {
    const result = parseEndpointKey("GET /user data/info");

    expect(result).toEqual({
      hasMethod: true,
      method: "GET",
      path: "/user data/info",
    });
  });

  it("should handle all HTTP methods", () => {
    const methods = [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "HEAD",
      "OPTIONS",
    ];

    methods.forEach((method) => {
      const result = parseEndpointKey(`${method} /endpoint`);
      expect(result).toEqual({
        hasMethod: true,
        method,
        path: "/endpoint",
      });
    });
  });

  it("should handle endpoint without leading slash", () => {
    const result = parseEndpointKey("GET users");

    expect(result).toEqual({
      hasMethod: true,
      method: "GET",
      path: "users",
    });
  });

  it("should handle empty string", () => {
    const result = parseEndpointKey("");

    expect(result).toEqual({
      hasMethod: false,
      method: "",
      path: "",
    });
  });

  it("should handle root path", () => {
    const result = parseEndpointKey("GET /");

    expect(result).toEqual({
      hasMethod: true,
      method: "GET",
      path: "/",
    });
  });
});
