/** This module verifies pull request import pagination helpers. */

import { describe, expect, it } from "vitest";

import {
  selectPullRequestsUpdatedSince,
  shouldStopPullRequestPagination,
} from "../pull-requests.js";

interface TestPullRequest {
  id: number;
  updated_at: string;
}

const createPullRequest = (id: number, updatedAt: string): TestPullRequest => ({
  id,
  updated_at: updatedAt,
});

describe("selectPullRequestsUpdatedSince", () => {
  it("keeps only pull requests updated on or after the cutoff", () => {
    const sinceDate = new Date("2024-01-10T00:00:00.000Z");
    const pullRequests = [
      createPullRequest(1, "2024-01-12T00:00:00.000Z"),
      createPullRequest(2, "2024-01-10T00:00:00.000Z"),
      createPullRequest(3, "2024-01-09T23:59:59.000Z"),
    ];

    const result = selectPullRequestsUpdatedSince(pullRequests, sinceDate);

    expect(result).toEqual([
      createPullRequest(1, "2024-01-12T00:00:00.000Z"),
      createPullRequest(2, "2024-01-10T00:00:00.000Z"),
    ]);
  });
});

describe("shouldStopPullRequestPagination", () => {
  it("returns false when the oldest pull request in the page is still in range", () => {
    const sinceDate = new Date("2024-01-10T00:00:00.000Z");
    const pullRequests = [
      createPullRequest(1, "2024-01-12T00:00:00.000Z"),
      createPullRequest(2, "2024-01-11T00:00:00.000Z"),
      createPullRequest(3, "2024-01-10T00:00:00.000Z"),
    ];

    const result = shouldStopPullRequestPagination(pullRequests, sinceDate);

    expect(result).toBe(false);
  });

  it("returns true when the page crosses the cutoff", () => {
    const sinceDate = new Date("2024-01-10T00:00:00.000Z");
    const pullRequests = [
      createPullRequest(1, "2024-01-12T00:00:00.000Z"),
      createPullRequest(2, "2024-01-11T00:00:00.000Z"),
      createPullRequest(3, "2024-01-09T23:59:59.000Z"),
    ];

    const result = shouldStopPullRequestPagination(pullRequests, sinceDate);

    expect(result).toBe(true);
  });

  it("returns false for an empty page", () => {
    const sinceDate = new Date("2024-01-10T00:00:00.000Z");

    const result = shouldStopPullRequestPagination([], sinceDate);

    expect(result).toBe(false);
  });
});
