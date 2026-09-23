/**
 * Database-backed integration tests for the workflows adapter.
 *
 * Skipped unless `DX_METRICS_TEST_DATABASE_URL` is set, so CI stays hermetic.
 * To run locally:
 *
 *   docker compose --profile dx-metrics up -d
 *   DX_METRICS_TEST_DATABASE_URL=postgres://... pnpm exec nx test dx-metrics
 *
 * Set `DX_METRICS_TEST_DATABASE_URL` to the same URL used as `DATABASE_URL`.
 */

import {
  createDatabaseConnection,
  type DatabaseConnection,
} from "@pagopa/dx-metrics-core/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getWorkflowDashboard } from "@/adapters/db/workflows/queries";

const testDatabaseUrl = process.env.DX_METRICS_TEST_DATABASE_URL;

describe.skipIf(!testDatabaseUrl)("workflows adapter (integration)", () => {
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

  // Regression guard: the DX vs non-DX classification once rendered its CASE
  // expression in both the SELECT list and the GROUP BY clause. Now that the
  // CASE binds parameters, the two renderings carry different placeholders and
  // PostgreSQL rejects the query. Only a real database surfaces this, so the
  // whole query set is executed here.
  it("executes the full dashboard query set", async () => {
    const { db } = requireConnection();

    const result = await getWorkflowDashboard(db, {
      days: 60,
      fullName: "pagopa/dx",
    });

    expect(Array.isArray(result.dxVsNonDx)).toBe(true);
  });
});
