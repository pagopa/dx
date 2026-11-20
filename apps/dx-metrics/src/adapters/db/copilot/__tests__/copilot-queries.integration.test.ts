/**
 * Database-backed integration test for the Copilot dashboard adapter.
 *
 * Skipped unless `DX_METRICS_TEST_DATABASE_URL` is set, so CI stays hermetic.
 * To run locally:
 *
 *   docker compose --profile dx-metrics up -d
 *   DX_METRICS_TEST_DATABASE_URL=postgres://... pnpm exec nx test dx-metrics
 */

import {
  createDatabaseConnection,
  type DatabaseConnection,
} from "@pagopa/dx-metrics-core/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getCopilotDashboard } from "@/adapters/db/copilot/queries";

const testDatabaseUrl = process.env.DX_METRICS_TEST_DATABASE_URL;

describe.skipIf(!testDatabaseUrl)("getCopilotDashboard (integration)", () => {
  let connection: DatabaseConnection | undefined;

  beforeAll(() => {
    if (testDatabaseUrl) {
      connection = createDatabaseConnection(testDatabaseUrl);
    }
  });

  afterAll(async () => {
    await connection?.pool.end();
  });

  const requireConnection = (): DatabaseConnection => {
    if (!connection) {
      throw new Error("Integration database connection is not initialised");
    }
    return connection;
  };

  it("returns a well-formed payload for a populated repository", async () => {
    const { db } = requireConnection();

    const result = await getCopilotDashboard(db, {
      days: 720,
      fullNames: ["pagopa/dx"],
    });

    expect(result.cards.mergedPrs).toBeGreaterThan(0);
    expect(result.cards.copilotReviewedPrs).toBeGreaterThan(0);
    expect(result.coverageTrend.length).toBeGreaterThan(0);
    expect(result.weeklyTrend.length).toBeGreaterThan(0);
    expect(result.coauthorLeadTimeTrend.length).toBeGreaterThan(0);
    expect(result.prSizeBuckets.length).toBeGreaterThan(0);
    expect(result.reviewCombination.copilotAndHuman).toBeGreaterThan(0);
    expect(result.insights.length).toBeGreaterThan(0);
    expect(Number.isNaN(new Date(result.meta.referenceDate).getTime())).toBe(
      false,
    );
  });

  it("returns an empty payload for a repository selection with no data", async () => {
    const { db } = requireConnection();

    const result = await getCopilotDashboard(db, {
      days: 720,
      fullNames: [],
    });

    expect(result.cards.mergedPrs).toBe(0);
    expect(result.cards.copilotReviewedPrs).toBe(0);
    expect(result.coverageTrend).toEqual([]);
    expect(result.weeklyTrend).toEqual([]);
    expect(result.recentAuthoredPrs).toEqual([]);
  });
});
