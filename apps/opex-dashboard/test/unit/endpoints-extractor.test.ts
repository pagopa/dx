/**
 * Unit tests for endpoints extractor.
 */

import { describe, expect, it } from "vitest";

import { OA3Spec } from "@/builders/azure-dashboard-raw/builder.schema.js";
import { extractEndpoints } from "@/builders/azure-dashboard-raw/endpoints-extractor.js";
import { ConfigError } from "@/core/errors/index.js";

describe("extractEndpoints", () => {
  const evaluationFrequency = 10;
  const evaluationTimeWindow = 20;
  const eventOccurrences = 1;

  it("should extract endpoints from OA3 spec with servers", () => {
    const oa3Spec = {
      paths: {
        "/posts": { post: {} },
        "/users": { get: {} },
      },
      servers: [{ url: "https://api.example.com/v1" }],
    };

    const result = extractEndpoints(
      oa3Spec as OA3Spec,
      evaluationFrequency,
      evaluationTimeWindow,
      eventOccurrences,
    );

    expect(result.hosts).toEqual(["api.example.com"]);
    expect(Object.keys(result.endpoints)).toEqual(["/v1/posts", "/v1/users"]);
    expect(result.endpoints["/v1/users"]).toHaveProperty(
      "availability_threshold",
    );
  });

  it("should extract endpoints from OA2 spec with host and basePath", () => {
    const oa2Spec = {
      basePath: "/v1",
      host: "api.example.com",
      paths: {
        "/users": { get: {} },
      },
    };

    const result = extractEndpoints(
      oa2Spec as OA3Spec,
      evaluationFrequency,
      evaluationTimeWindow,
      eventOccurrences,
    );

    expect(result.hosts).toEqual(["api.example.com"]);
    expect(Object.keys(result.endpoints)).toEqual(["/v1/users"]);
  });

  it("should throw error when no servers or host", () => {
    const spec = {
      paths: { "/test": {} },
    };

    expect(() =>
      extractEndpoints(
        spec as OA3Spec,
        evaluationFrequency,
        evaluationTimeWindow,
        eventOccurrences,
      ),
    ).toThrow(ConfigError);
  });

  it("should throw error when no paths", () => {
    const spec = {
      paths: {},
      servers: [{ url: "https://api.example.com" }],
    };

    expect(() =>
      extractEndpoints(
        spec as OA3Spec,
        evaluationFrequency,
        evaluationTimeWindow,
        eventOccurrences,
      ),
    ).toThrow(ConfigError);
  });

  it("should handle multiple servers and deduplicate endpoints", () => {
    const oa3Spec = {
      paths: {
        "/users": { get: {} },
      },
      servers: [
        { url: "https://api1.example.com" },
        { url: "https://api2.example.com" },
      ],
    };

    const result = extractEndpoints(
      oa3Spec as OA3Spec,
      evaluationFrequency,
      evaluationTimeWindow,
      eventOccurrences,
    );

    expect(result.hosts).toEqual(["api1.example.com", "api2.example.com"]);
    expect(Object.keys(result.endpoints)).toEqual(["/users"]);
  });

  it("should normalize paths correctly", () => {
    const oa3Spec = {
      paths: {
        "/posts/": { post: {} },
        users: { get: {} },
      },
      servers: [{ url: "https://api.example.com/v1/" }],
    };

    const result = extractEndpoints(
      oa3Spec as OA3Spec,
      evaluationFrequency,
      evaluationTimeWindow,
      eventOccurrences,
    );

    expect(Object.keys(result.endpoints)).toEqual(["/v1/posts/", "/v1/users"]);
  });
});
