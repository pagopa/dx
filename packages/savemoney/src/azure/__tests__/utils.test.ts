/**
 * Tests for matchesTags() — verifies AND-logic tag filtering:
 * 1. No filter (undefined/empty) → always include the resource.
 * 2. Exact key-value match → include.
 * 3. Key missing on resource → exclude.
 * 4. Key present but wrong value → exclude.
 * 5. Multiple tags: all match → include; any mismatch → exclude.
 */

import type { GenericResource } from "@azure/arm-resources";

import { describe, expect, it } from "vitest";

import { matchesTags } from "../utils.js";

function makeResource(tags?: Record<string, string>): GenericResource {
  return { id: "r1", name: "res", tags };
}

describe("matchesTags", () => {
  describe("when no filter is provided", () => {
    it("returns true for undefined filterTags", () => {
      expect(matchesTags(makeResource({ env: "prod" }), undefined)).toBe(true);
    });

    it("returns true for empty filterTags object", () => {
      expect(matchesTags(makeResource({ env: "prod" }), {})).toBe(true);
    });

    it("returns true even when resource has no tags", () => {
      expect(matchesTags(makeResource(), undefined)).toBe(true);
    });
  });

  describe("single tag filter", () => {
    it("returns true when tag key and value match exactly", () => {
      expect(matchesTags(makeResource({ env: "prod" }), { env: "prod" })).toBe(
        true,
      );
    });

    it("returns false when tag key is missing from resource", () => {
      expect(matchesTags(makeResource({ app: "myapp" }), { env: "prod" })).toBe(
        false,
      );
    });

    it("returns false when tag key exists but value differs", () => {
      expect(matchesTags(makeResource({ env: "dev" }), { env: "prod" })).toBe(
        false,
      );
    });

    it("returns false when resource has no tags at all", () => {
      expect(matchesTags(makeResource(), { env: "prod" })).toBe(false);
    });

    it("is case-sensitive for tag values", () => {
      expect(matchesTags(makeResource({ env: "Prod" }), { env: "prod" })).toBe(
        false,
      );
    });
  });

  describe("multiple tag filters (AND logic)", () => {
    it("returns true when all filter tags match", () => {
      const resource = makeResource({
        env: "prod",
        region: "italy",
        team: "dx",
      });
      expect(matchesTags(resource, { env: "prod", team: "dx" })).toBe(true);
    });

    it("returns false when one of the filter tags is missing", () => {
      const resource = makeResource({ env: "prod" });
      expect(matchesTags(resource, { env: "prod", team: "dx" })).toBe(false);
    });

    it("returns false when one of the filter tags has the wrong value", () => {
      const resource = makeResource({ env: "prod", team: "backend" });
      expect(matchesTags(resource, { env: "prod", team: "dx" })).toBe(false);
    });

    it("returns false when both filter tags have wrong values", () => {
      const resource = makeResource({ env: "dev", team: "backend" });
      expect(matchesTags(resource, { env: "prod", team: "dx" })).toBe(false);
    });
  });
});
