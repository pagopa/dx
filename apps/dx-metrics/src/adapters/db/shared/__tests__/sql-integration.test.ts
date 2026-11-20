/**
 * Database-backed integration tests for shared SQL helpers.
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
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  buildReferenceDateQuery,
  parseReferenceDate,
} from "@/adapters/db/shared/reference-date";
import { botAuthorsExclusion } from "@/adapters/db/shared/sql-fragments";

const testDatabaseUrl = process.env.DX_METRICS_TEST_DATABASE_URL;

describe.skipIf(!testDatabaseUrl)("shared SQL helpers (integration)", () => {
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

  it("resolves a reference date from a real table", async () => {
    const { db } = requireConnection();

    const result = await db.execute(
      buildReferenceDateQuery({
        column: "created_at",
        from: "pull_requests",
      }),
    );

    const referenceDate = parseReferenceDate(
      result.rows[0],
      "integration referenceDate",
    );

    expect(typeof referenceDate).toBe("string");
    expect(Number.isNaN(new Date(referenceDate).getTime())).toBe(false);
  });

  it("executes the bot exclusion predicate against PostgreSQL", async () => {
    const { db } = requireConnection();

    const result = await db.execute(
      sql`SELECT COUNT(*) AS value FROM pull_requests pr WHERE ${botAuthorsExclusion("pr.author")}`,
    );

    expect(result.rows).toHaveLength(1);
  });
});
