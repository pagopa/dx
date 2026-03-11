import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { DashboardQuerySchema, parseDashboardQuery } from "../query-params.js";

const makeRequest = (params: Record<string, string> = {}) => {
  const url = new URL("http://localhost/api/dashboard");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString());
};

describe("DashboardQuerySchema", () => {
  it("applies default days of 120 when not provided", () => {
    const result = DashboardQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.success && result.data.days).toBe(120);
  });

  it("coerces a string days value to a number", () => {
    const result = DashboardQuerySchema.safeParse({ days: "60" });
    expect(result.success).toBe(true);
    expect(result.success && result.data.days).toBe(60);
  });

  it("rejects non-positive days values", () => {
    expect(DashboardQuerySchema.safeParse({ days: "0" }).success).toBe(false);
    expect(DashboardQuerySchema.safeParse({ days: "-1" }).success).toBe(false);
  });

  it("rejects non-integer days values", () => {
    expect(DashboardQuerySchema.safeParse({ days: "1.5" }).success).toBe(false);
  });

  it("accepts an optional repository string", () => {
    const result = DashboardQuerySchema.safeParse({ repository: "my-repo" });
    expect(result.success).toBe(true);
    expect(result.success && result.data.repository).toBe("my-repo");
  });

  it("rejects an empty repository string", () => {
    expect(DashboardQuerySchema.safeParse({ repository: "" }).success).toBe(
      false,
    );
  });

  it("repository is optional — omitting it is valid", () => {
    const result = DashboardQuerySchema.safeParse({ days: "30" });
    expect(result.success).toBe(true);
    expect(result.success && result.data.repository).toBeUndefined();
  });
});

describe("parseDashboardQuery", () => {
  it("returns parsed query on valid request with defaults", () => {
    const req = makeRequest();
    const result = parseDashboardQuery(req);
    expect("query" in result).toBe(true);
    expect("query" in result && result.query.days).toBe(120);
  });

  it("returns parsed query with provided valid params", () => {
    const req = makeRequest({ days: "30", repository: "myrepo" });
    const result = parseDashboardQuery(req);
    expect("query" in result).toBe(true);
    if ("query" in result) {
      expect(result.query.days).toBe(30);
      expect(result.query.repository).toBe("myrepo");
    }
  });

  it("returns a 400 error response for invalid days", () => {
    const req = makeRequest({ days: "-5" });
    const result = parseDashboardQuery(req);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(400);
    }
  });

  it("returns a 400 error response for non-numeric days", () => {
    const req = makeRequest({ days: "abc" });
    const result = parseDashboardQuery(req);
    expect("error" in result).toBe(true);
  });
});
