/** Verifies GitHub token selection for the run-dx-task action. */

import { describe, expect, it } from "vitest";

import { resolveGitHubToken } from "../github-token.js";

describe("resolveGitHubToken", () => {
  it("prefers the explicit action input", () => {
    expect(resolveGitHubToken("input-token", "environment-token")).toBe(
      "input-token",
    );
  });

  it("falls back to GITHUB_TOKEN when the input is empty", () => {
    expect(resolveGitHubToken("", "environment-token")).toBe(
      "environment-token",
    );
  });

  it("returns undefined when neither source provides a token", () => {
    expect(resolveGitHubToken("", undefined)).toBeUndefined();
  });
});
