import { describe, expect, it } from "vitest";

import { computeRange, detectMode, ZERO_SHA } from "../detect-intent.js";

describe("computeRange", () => {
  it("returns HEAD~1..HEAD when before is empty", () => {
    expect(computeRange({}, undefined)).toEqual({
      base: "HEAD~1",
      head: "HEAD",
    });
  });

  it("returns HEAD~1..HEAD when before is ZERO_SHA (branch creation)", () => {
    expect(computeRange({ before: ZERO_SHA }, undefined)).toEqual({
      base: "HEAD~1",
      head: "HEAD",
    });
  });

  it("uses before/after from the event", () => {
    expect(
      computeRange({ after: "abc123", before: "def456" }, undefined),
    ).toEqual({ base: "def456", head: "abc123" });
  });

  it("falls back to GITHUB_SHA when after is missing", () => {
    expect(computeRange({ before: "def456" }, "sha-from-env")).toEqual({
      base: "def456",
      head: "sha-from-env",
    });
  });

  it("falls back to HEAD when both after and GITHUB_SHA are missing", () => {
    expect(computeRange({ before: "def456" }, undefined)).toEqual({
      base: "def456",
      head: "HEAD",
    });
  });
});

describe("detectMode", () => {
  it("returns 'create-pr' when a version plan file is added", () => {
    const diff = "A\t.nx/version-plans/bump-my-pkg.md";
    expect(detectMode(diff)).toBe("create-pr");
  });

  it("returns 'create-pr' when a version plan file is modified", () => {
    const diff = "M\t.nx/version-plans/existing.md";
    expect(detectMode(diff)).toBe("create-pr");
  });

  it("returns 'publish' when version plans are deleted and version bumps exist", () => {
    const diff = [
      "D\t.nx/version-plans/bump-my-pkg.md",
      "M\tpackages/my-pkg/package.json",
    ].join("\n");
    expect(detectMode(diff)).toBe("publish");
  });

  it("returns 'noop' when only unrelated files changed", () => {
    const diff = ["M\tsrc/index.ts", "M\tREADME.md"].join("\n");
    expect(detectMode(diff)).toBe("noop");
  });

  it("returns 'noop' when version plans are deleted but no version bump", () => {
    const diff = "D\t.nx/version-plans/bump-my-pkg.md";
    expect(detectMode(diff)).toBe("noop");
  });

  it("returns 'noop' for empty diff", () => {
    expect(detectMode("")).toBe("noop");
  });

  it("returns 'create-pr' for version plan in nested path", () => {
    const diff = "A\t.nx/version-plans/feature/my-plan.md";
    expect(detectMode(diff)).toBe("create-pr");
  });

  it("prefers 'create-pr' over other modes when plan is added alongside deletion", () => {
    const diff = [
      "A\t.nx/version-plans/new-plan.md",
      "D\t.nx/version-plans/old-plan.md",
      "M\tpackages/my-pkg/package.json",
    ].join("\n");
    expect(detectMode(diff)).toBe("create-pr");
  });
});
