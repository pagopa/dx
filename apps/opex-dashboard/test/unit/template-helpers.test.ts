/**
 * Unit tests for template helpers.
 */

import { describe, expect, it } from "vitest";

import { uriToRegex } from "@/core/template/helpers.js";

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
