/** Tests for the shared reference-date resolver. */

import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  buildReferenceDateQuery,
  parseReferenceDate,
} from "@/adapters/db/shared/reference-date";

const dialect = new PgDialect();

describe("buildReferenceDateQuery", () => {
  it("renders a scoped COALESCE(MAX(...), NOW()) query", () => {
    const rendered = dialect.sqlToQuery(
      buildReferenceDateQuery({
        column: "GREATEST(pr.created_at, pr.merged_at)",
        from: "pull_requests pr JOIN repositories r ON pr.repository_id = r.id",
        where: sql`r.full_name = ${"pagopa/dx"}`,
      }),
    );

    expect(rendered.sql).toBe(
      'SELECT COALESCE(MAX(GREATEST(pr.created_at, pr.merged_at)), NOW()) AS "referenceDate" FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id WHERE r.full_name = $1',
    );
    expect(rendered.params).toEqual(["pagopa/dx"]);
  });

  it("omits the WHERE clause when no scope is given", () => {
    const rendered = dialect.sqlToQuery(
      buildReferenceDateQuery({
        column: "submitted_at",
        from: "tracker_requests",
      }),
    );

    expect(rendered.sql).toBe(
      'SELECT COALESCE(MAX(submitted_at), NOW()) AS "referenceDate" FROM tracker_requests',
    );
  });
});

describe("parseReferenceDate", () => {
  it("normalizes a Date instance to an ISO timestamp", () => {
    expect(
      parseReferenceDate(
        { referenceDate: new Date("2026-03-14T08:15:00.000Z") },
        "test",
      ),
    ).toBe("2026-03-14T08:15:00.000Z");
  });

  it("throws a descriptive error for an invalid row", () => {
    expect(() => parseReferenceDate({ referenceDate: "" }, "test")).toThrow(
      /test/,
    );
  });
});
