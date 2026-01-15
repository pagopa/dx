import { describe, expect, it, vi } from "vitest";

// Mock the Octokit to avoid actual GitHub API calls
vi.mock("@octokit/rest", () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    rest: {
      repos: {
        getContent: vi.fn().mockResolvedValue({
          data: { content: Buffer.from("mock content").toString("base64") },
        }),
      },
      search: {
        code: vi.fn().mockResolvedValue({
          data: {
            items: [
              {
                html_url: "https://github.com/pagopa/dx/blob/main/test.tf",
                path: "test.tf",
                repository: { full_name: "pagopa/dx", name: "dx" },
              },
            ],
            total_count: 1,
          },
        }),
      },
    },
  })),
}));

import { SearchGitHubCodeTool } from "../SearchGitHubCode.js";

describe("SearchGitHubCodeTool", () => {
  it("should reject empty queries", async () => {
    const args = { query: "" };
    const context = { session: { token: "test-token" } };
    const result = await SearchGitHubCodeTool.execute(args, context);
    expect(result).toContain("Error: Invalid input");
    expect(result).toContain("Query cannot be empty");
  });

  it("should reject queries exceeding 500 characters", async () => {
    const args = { query: "a".repeat(501) };
    const context = { session: { token: "test-token" } };
    const result = await SearchGitHubCodeTool.execute(args, context);
    expect(result).toContain("Error: Invalid input");
    expect(result).toContain("Query too long");
  });

  it("should reject unknown parameters due to strict schema", async () => {
    const args = { query: "test query", unknownParam: "value" };
    const context = { session: { token: "test-token" } };
    const result = await SearchGitHubCodeTool.execute(args, context);
    expect(result).toContain("Error: Invalid input");
    expect(result).toContain("Unrecognized key");
  });

  it("should return error when no GitHub token is available", async () => {
    const args = { query: "test query" };
    const result = await SearchGitHubCodeTool.execute(args, undefined);
    expect(result).toContain("Error: GitHub token not available in session");
  });

  it("should return error when session is missing token", async () => {
    const args = { query: "test query" };
    const context = { session: undefined };
    const result = await SearchGitHubCodeTool.execute(args, context);
    expect(result).toContain("Error: GitHub token not available in session");
  });

  it("should accept valid queries with token", async () => {
    const args = { query: "azure-function-app" };
    const context = { session: { token: "test-token" } };
    const result = await SearchGitHubCodeTool.execute(args, context);
    // Should return results, not an error
    expect(result).not.toContain("Error:");
    expect(result).toContain("azure-function-app");
  });

  it("should support pagination parameters", async () => {
    const args = { page: 2, per_page: 20, query: "terraform module" };
    const context = { session: { token: "test-token" } };
    const result = await SearchGitHubCodeTool.execute(args, context);
    expect(result).not.toContain("Error:");
  });

  it("should reject per_page exceeding maximum", async () => {
    const args = { per_page: 100, query: "test query" };
    const context = { session: { token: "test-token" } };
    const result = await SearchGitHubCodeTool.execute(args, context);
    expect(result).toContain("Error: Invalid input");
    expect(result).toContain("per_page cannot exceed 30");
  });
});
