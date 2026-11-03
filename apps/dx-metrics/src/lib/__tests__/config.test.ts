/**
 * Guards the repository configuration: every repository must be reachable
 * through at least one tag, or it is visible to nobody.
 */

import { dxMetricsConfig } from "@pagopa/dx-metrics-core/config";
import { describe, expect, it } from "vitest";

/**
 * Tags decide who may see a repository. A repository without a tag is visible
 * to nobody, and a misspelled tag silently creates a new scope that no magic
 * link points at, so both are treated as build failures.
 */
const TAG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

describe("dxMetricsConfig.repositories", () => {
  const repositories = dxMetricsConfig.repositories;

  it("has unique repository names", () => {
    const names = repositories.map((repository) => repository.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("gives every repository at least one tag", () => {
    const untagged = repositories.filter(
      (repository) => repository.tags.length === 0,
    );
    expect(untagged.map((repository) => repository.name)).toEqual([]);
  });

  it("uses only well-formed tags", () => {
    const malformed = repositories.flatMap((repository) =>
      repository.tags
        .filter((tag) => !TAG_PATTERN.test(tag))
        .map((tag) => `${repository.name}:${tag}`),
    );
    expect(malformed).toEqual([]);
  });

  it("does not repeat a tag on the same repository", () => {
    const repeated = repositories.flatMap((repository) =>
      repository.tags.length === new Set(repository.tags).size
        ? []
        : [repository.name],
    );
    expect(repeated).toEqual([]);
  });

  it("uses the known tag vocabulary", () => {
    const tags = [...new Set(repositories.flatMap((r) => r.tags))].sort();
    // Adding a tag is a deliberate act: it opens a new scope. Update this list
    // in the same change that introduces the tag.
    expect(tags).toEqual([
      "bb",
      "dx",
      "idpay",
      "io",
      "p4pa",
      "pagopa",
      "pdnd",
      "plsm",
      "pn",
      "portals",
      "selfcare",
    ]);
  });
});
