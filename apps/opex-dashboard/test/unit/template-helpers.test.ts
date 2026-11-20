/**
 * Unit tests for template helpers.
 */

import { describe, expect, it } from "vitest";

import { joinUriPath, uriToRegex } from "@/core/template/helpers.js";

describe("uriToRegex", () => {
  it("should convert path parameters into a single-segment pattern", () => {
    expect(uriToRegex("/api/{id}/items/{itemId}")).toBe(
      "^/api/[^/]+/items/[^/]+$",
    );
  });

  it("should anchor the pattern with ^ and $", () => {
    expect(uriToRegex("/users")).toBe("^/users$");
  });

  it("should escape regex metacharacters in literal segments", () => {
    expect(uriToRegex("/v1/status.json")).toBe("^/v1/status\\.json$");
    expect(uriToRegex("/reports/a+b")).toBe("^/reports/a\\+b$");
  });

  it("should escape metacharacters while keeping path parameters", () => {
    expect(uriToRegex("/files/{name}.csv")).toBe("^/files/[^/]+\\.csv$");
  });
});

describe("joinUriPath", () => {
  it("should join an empty base path", () => {
    expect(joinUriPath("", "/api/users")).toBe("/api/users");
  });

  it("should add a leading slash when the base path has none", () => {
    expect(joinUriPath("basepath", "/api/users")).toBe("/basepath/api/users");
  });

  it("should not duplicate slashes", () => {
    expect(joinUriPath("/basepath/", "/api//users")).toBe(
      "/basepath/api/users",
    );
  });
});
