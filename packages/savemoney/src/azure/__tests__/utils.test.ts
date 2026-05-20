/**
 * Tests for matchesTags() — verifies AND-logic tag filtering:
 * 1. No filter (undefined/empty) → always include the resource.
 * 2. Exact key-value match → include.
 * 3. Key missing on resource → exclude.
 * 4. Key present but wrong value → exclude.
 * 5. Multiple tags: all match → include; any mismatch → exclude.
 *
 * Tests for getMetric() cache behaviour:
 * 6. resetMetricsCache() clears state between runs.
 * 7. Concurrent calls for the same key coalesce into one network call.
 * 8. A failed call is cached as a rejected promise (not retried silently).
 */

import type { GenericResource } from "@azure/arm-resources";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  _metricsCacheSize,
  getMetric,
  matchesTags,
  resetMetricsCache,
} from "../utils.js";

function makeResource(tags?: Record<string, string>): GenericResource {
  return { id: "r1", name: "res", tags };
}

describe("matchesTags", () => {
  describe("when no filter is provided", () => {
    it("returns true for undefined filterTags", () => {
      expect(matchesTags(makeResource({ env: "prod" }), undefined)).toBe(true);
    });

    it("returns true for empty Map", () => {
      expect(matchesTags(makeResource({ env: "prod" }), new Map())).toBe(true);
    });

    it("returns true even when resource has no tags", () => {
      expect(matchesTags(makeResource(), undefined)).toBe(true);
    });
  });

  describe("single tag filter", () => {
    it("returns true when tag key and value match exactly", () => {
      expect(
        matchesTags(makeResource({ env: "prod" }), new Map([["env", "prod"]])),
      ).toBe(true);
    });

    it("returns false when tag key is missing from resource", () => {
      expect(
        matchesTags(makeResource({ app: "myapp" }), new Map([["env", "prod"]])),
      ).toBe(false);
    });

    it("returns false when tag key exists but value differs", () => {
      expect(
        matchesTags(makeResource({ env: "dev" }), new Map([["env", "prod"]])),
      ).toBe(false);
    });

    it("returns false when resource has no tags at all", () => {
      expect(matchesTags(makeResource(), new Map([["env", "prod"]]))).toBe(
        false,
      );
    });

    it("is case-sensitive for tag values", () => {
      expect(
        matchesTags(makeResource({ env: "Prod" }), new Map([["env", "prod"]])),
      ).toBe(false);
    });
  });

  describe("multiple tag filters (AND logic)", () => {
    it("returns true when all filter tags match", () => {
      const resource = makeResource({
        env: "prod",
        region: "italy",
        team: "dx",
      });
      expect(
        matchesTags(
          resource,
          new Map([
            ["env", "prod"],
            ["team", "dx"],
          ]),
        ),
      ).toBe(true);
    });

    it("returns false when one of the filter tags is missing", () => {
      const resource = makeResource({ env: "prod" });
      expect(
        matchesTags(
          resource,
          new Map([
            ["env", "prod"],
            ["team", "dx"],
          ]),
        ),
      ).toBe(false);
    });

    it("returns false when one of the filter tags has the wrong value", () => {
      const resource = makeResource({ env: "prod", team: "backend" });
      expect(
        matchesTags(
          resource,
          new Map([
            ["env", "prod"],
            ["team", "dx"],
          ]),
        ),
      ).toBe(false);
    });

    it("returns false when both filter tags have wrong values", () => {
      const resource = makeResource({ env: "dev", team: "backend" });
      expect(
        matchesTags(
          resource,
          new Map([
            ["env", "prod"],
            ["team", "dx"],
          ]),
        ),
      ).toBe(false);
    });
  });
});

// ── metrics cache ──────────────────────────────────────────────────────────

function makeFailingMonitorClient(calls: number[] = []) {
  return {
    metrics: {
      list: vi.fn().mockImplementation(async () => {
        calls.push(1);
        throw new Error("network error");
      }),
    },
  } as unknown as Parameters<typeof getMetric>[0];
}

function makeMonitorClient(returnValue: null | number, calls: number[] = []) {
  return {
    metrics: {
      list: vi.fn().mockImplementation(async () => {
        calls.push(1);
        if (returnValue === null) {
          return { value: [] };
        }
        return {
          value: [
            {
              timeseries: [{ data: [{ average: returnValue }] }],
            },
          ],
        };
      }),
    },
  } as unknown as Parameters<typeof getMetric>[0];
}

describe("getMetric — in-memory cache", () => {
  beforeEach(() => {
    resetMetricsCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resetMetricsCache clears all cached entries", async () => {
    const calls: number[] = [];
    const client = makeMonitorClient(42, calls);

    await getMetric(client, "/res/1", "Percentage CPU", "Average", 7);
    expect(_metricsCacheSize()).toBe(1);

    resetMetricsCache();
    expect(_metricsCacheSize()).toBe(0);
  });

  it("does not call the API a second time for the same key", async () => {
    const calls: number[] = [];
    const client = makeMonitorClient(10, calls);

    await getMetric(client, "/res/1", "Percentage CPU", "Average", 7);
    await getMetric(client, "/res/1", "Percentage CPU", "Average", 7);

    expect(calls.length).toBe(1);
  });

  it("concurrent calls for the same key coalesce into one network call", async () => {
    const calls: number[] = [];
    const client = makeMonitorClient(5, calls);

    await Promise.all([
      getMetric(client, "/res/2", "Network In Total", "Average", 30),
      getMetric(client, "/res/2", "Network In Total", "Average", 30),
      getMetric(client, "/res/2", "Network In Total", "Average", 30),
    ]);

    expect(calls.length).toBe(1);
  });

  it("different keys result in separate network calls", async () => {
    const calls: number[] = [];
    const client = makeMonitorClient(1, calls);

    await getMetric(client, "/res/a", "Percentage CPU", "Average", 7);
    await getMetric(client, "/res/b", "Percentage CPU", "Average", 7);

    expect(calls.length).toBe(2);
  });

  it("returns null and caches the null result when no data points are available", async () => {
    const calls: number[] = [];
    const client = makeMonitorClient(null, calls);

    const first = await getMetric(
      client,
      "/res/3",
      "Percentage CPU",
      "Average",
      7,
    );
    const second = await getMetric(
      client,
      "/res/3",
      "Percentage CPU",
      "Average",
      7,
    );

    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(calls.length).toBe(1);
  });

  it("a failing call is cached and returns null on retry", async () => {
    const calls: number[] = [];
    const client = makeFailingMonitorClient(calls);

    const first = await getMetric(
      client,
      "/res/4",
      "Percentage CPU",
      "Average",
      7,
    );
    const second = await getMetric(
      client,
      "/res/4",
      "Percentage CPU",
      "Average",
      7,
    );

    // Both calls return null (error is swallowed by getMetric)
    expect(first).toBeNull();
    expect(second).toBeNull();
    // Only one actual network call despite two getMetric calls
    expect(calls.length).toBe(1);
  });

  it("after resetMetricsCache the API is called again", async () => {
    const calls: number[] = [];
    const client = makeMonitorClient(7, calls);

    await getMetric(client, "/res/5", "Percentage CPU", "Average", 7);
    resetMetricsCache();
    await getMetric(client, "/res/5", "Percentage CPU", "Average", 7);

    expect(calls.length).toBe(2);
  });
});
