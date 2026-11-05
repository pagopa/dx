import type { DxMetricsRepository } from "@pagopa/dx-metrics-core/config";
import { describe, expect, it } from "vitest";

import { fullPortfolioScope, intersectScope, resolveScope } from "../scope.js";

/** A small configuration with one repository in two tags. */
const CONFIGURED: readonly DxMetricsRepository[] = [
  { name: "dx", tags: ["dx"] },
  { name: "p4pa-a", tags: ["p4pa"] },
  { name: "p4pa-b", tags: ["p4pa"] },
  { name: "bb-a", tags: ["bb"] },
  { name: "bb-one", tags: ["bb"] },
  { name: "shared", tags: ["bb", "p4pa"] },
];

describe("resolveScope", () => {
  it("resolves a tag to its repositories, sorted", () => {
    const scope = resolveScope({ tags: ["p4pa"], v: 1 }, CONFIGURED);

    expect(scope).toEqual({
      all: false,
      repositories: ["p4pa-a", "p4pa-b", "shared"],
      tags: ["p4pa"],
    });
  });

  it("unions several tags without repeating a shared repository", () => {
    const scope = resolveScope({ tags: ["bb", "p4pa"], v: 1 }, CONFIGURED);

    expect(scope?.repositories).toEqual([
      "bb-a",
      "bb-one",
      "p4pa-a",
      "p4pa-b",
      "shared",
    ]);
  });

  it("returns null when any tag is unknown", () => {
    expect(
      resolveScope({ tags: ["p4pa", "gone"], v: 1 }, CONFIGURED),
    ).toBeNull();
  });

  it("gives the full-portfolio payload every configured repository", () => {
    const scope = resolveScope({ all: true, v: 1 }, CONFIGURED);

    expect(scope).toEqual({
      all: true,
      repositories: ["bb-a", "bb-one", "dx", "p4pa-a", "p4pa-b", "shared"],
      tags: [],
    });
  });

  it("marks a full-portfolio scope as all even when tags cover everything", () => {
    const scope = resolveScope(
      { tags: ["bb", "dx", "p4pa"], v: 1 },
      CONFIGURED,
    );

    expect(scope?.all).toBe(false);
    expect(scope?.repositories).toHaveLength(
      fullPortfolioScope(CONFIGURED).repositories.length,
    );
  });
});

describe("intersectScope", () => {
  const scope = resolveScope({ tags: ["p4pa"], v: 1 }, CONFIGURED)!;

  it("keeps the allowed repositories and drops the rest", () => {
    expect(intersectScope(["p4pa-a", "dx", "shared"], scope)).toEqual([
      "p4pa-a",
      "shared",
    ]);
  });

  it("preserves the caller's order", () => {
    expect(intersectScope(["shared", "p4pa-b", "p4pa-a"], scope)).toEqual([
      "shared",
      "p4pa-b",
      "p4pa-a",
    ]);
  });

  it("removes duplicates", () => {
    expect(intersectScope(["p4pa-a", "p4pa-a"], scope)).toEqual(["p4pa-a"]);
  });

  it("keeps an explicit empty selection empty", () => {
    expect(intersectScope([], scope)).toEqual([]);
  });
});
