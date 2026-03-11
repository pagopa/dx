// Tests for workspaceSchema transforms (lowercase and trim on domain).
import { describe, expect, it } from "vitest";

import { workspaceSchema } from "../prompts.js";

describe("workspaceSchema — domain transforms", () => {
  it("lowercases an uppercase domain", () => {
    const result = workspaceSchema.safeParse({ domain: "API" });

    expect(result.success).toBe(true);
    expect(result.success && result.data.domain).toBe("api");
  });

  it("lowercases a mixed-case domain", () => {
    const result = workspaceSchema.safeParse({ domain: "MyDomain" });

    expect(result.success).toBe(true);
    expect(result.success && result.data.domain).toBe("mydomain");
  });

  it("trims leading and trailing whitespace from domain", () => {
    const result = workspaceSchema.safeParse({ domain: " aPi " });

    expect(result.success).toBe(true);
    expect(result.success && result.data.domain).toBe("api");
  });

  it("defaults domain to empty string when not provided", () => {
    const result = workspaceSchema.safeParse({});

    expect(result.success).toBe(true);
    expect(result.success && result.data.domain).toBe("");
  });
});
