/** Tests for shared SQL fragments used by dashboard adapters. */

import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  botAuthorsExclusion,
  deployWorkflowMatch,
  dxPipelineCase,
  dxWorkflowNameLabel,
  movingWindow,
  notLikeAll,
  textArray,
  timeBucket,
  timeBucketInterval,
  WEEKLY_BUCKET_THRESHOLD_DAYS,
} from "@/adapters/db/shared/sql-fragments";
import { BOT_AUTHORS } from "@/lib/config";

const dialect = new PgDialect();

describe("botAuthorsExclusion", () => {
  it("excludes the configured list and any [bot] account", () => {
    const query = dialect.sqlToQuery(botAuthorsExclusion("pr.author"));

    expect(query.sql).toBe(
      "(pr.author NOT IN ($1, $2, $3) AND pr.author NOT LIKE '%[bot]')",
    );
    expect(query.params).toEqual([...BOT_AUTHORS]);
  });

  it("allows the same fragment to target a different column", () => {
    const query = dialect.sqlToQuery(botAuthorsExclusion("reviewer"));

    expect(query.sql).toBe(
      "(reviewer NOT IN ($1, $2, $3) AND reviewer NOT LIKE '%[bot]')",
    );
  });
});

describe("dxPipelineCase", () => {
  it("classifies DX and non-DX pipelines with literal labels", () => {
    const query = dialect.sqlToQuery(dxPipelineCase("w.pipeline"));

    expect(query.sql).toBe(
      "CASE WHEN w.pipeline LIKE '%pagopa/dx%' THEN 'DX Pipelines' ELSE 'Non-DX Pipelines' END",
    );
    expect(query.params).toEqual([]);
  });
});

describe("dxWorkflowNameLabel", () => {
  it("prefixes only DX workflow names", () => {
    const query = dialect.sqlToQuery(
      dxWorkflowNameLabel("w.name", "w.pipeline"),
    );

    expect(query.sql).toBe(
      "CONCAT(CASE WHEN w.pipeline LIKE '%pagopa/dx%' THEN 'DX ' ELSE '' END, w.name)",
    );
    expect(query.params).toEqual([]);
  });
});

describe("timeBucket", () => {
  it("exposes a single weekly threshold constant", () => {
    expect(WEEKLY_BUCKET_THRESHOLD_DAYS).toBe(240);
  });

  it("buckets a plain column by day or week", () => {
    const query = dialect.sqlToQuery(timeBucket("pr.created_at", 120));

    expect(query.sql).toBe(
      "CASE WHEN $1 < $2 THEN pr.created_at::date ELSE DATE_TRUNC('week', pr.created_at)::date END",
    );
    expect(query.params).toEqual([120, WEEKLY_BUCKET_THRESHOLD_DAYS]);
  });

  it("accepts a bound fragment as the bucket source", () => {
    const source = timeBucket("CURRENT_DATE", 300);
    const query = dialect.sqlToQuery(source);

    expect(query.sql).toContain("DATE_TRUNC('week', CURRENT_DATE)");
    expect(query.params).toEqual([300, WEEKLY_BUCKET_THRESHOLD_DAYS]);
  });
});

describe("timeBucketInterval", () => {
  it("matches the day/week threshold used by timeBucket", () => {
    const query = dialect.sqlToQuery(timeBucketInterval(120));

    expect(query.sql).toBe(
      "CASE WHEN $1 < $2 THEN '1 day'::interval ELSE '1 week'::interval END",
    );
    expect(query.params).toEqual([120, WEEKLY_BUCKET_THRESHOLD_DAYS]);
  });
});

describe("textArray", () => {
  it("builds a parameterized text array", () => {
    const rendered = dialect.sqlToQuery(textArray(["dx", "io-infra"]));

    expect(rendered.sql).toBe("ARRAY[$1, $2]::text[]");
    expect(rendered.params).toEqual(["dx", "io-infra"]);
  });

  it("builds an empty typed array for an empty list", () => {
    const rendered = dialect.sqlToQuery(textArray([]));

    expect(rendered.sql).toBe("ARRAY[]::text[]");
  });
});

describe("notLikeAll", () => {
  it("joins one NOT LIKE per excluded substring", () => {
    const rendered = dialect.sqlToQuery(
      notLikeAll("repository_full_name", ["dx", "eng"]),
    );

    expect(rendered.sql).toBe(
      "repository_full_name NOT LIKE $1 AND repository_full_name NOT LIKE $2",
    );
    expect(rendered.params).toEqual(["%dx%", "%eng%"]);
  });

  it("returns TRUE for an empty list", () => {
    const rendered = dialect.sqlToQuery(notLikeAll("x", []));

    expect(rendered.sql).toBe("TRUE");
    expect(rendered.params).toEqual([]);
  });
});

describe("deployWorkflowMatch", () => {
  it("matches deploy-like names case-insensitively", () => {
    const rendered = dialect.sqlToQuery(deployWorkflowMatch("w.name"));

    expect(rendered.sql).toBe(
      "(LOWER(w.name) LIKE '%deploy%' OR LOWER(w.name) LIKE '%delivery%' OR LOWER(w.name) LIKE '%release%' OR LOWER(w.name) LIKE '%apply%')",
    );
    expect(rendered.params).toEqual([]);
  });
});

describe("movingWindow", () => {
  it("builds a relative lower bound with a bound number of days", () => {
    const query = dialect.sqlToQuery(movingWindow("wr.created_at", 30));

    expect(query.sql).toBe(
      "wr.created_at::timestamptz - MAKE_INTERVAL(days => $1)",
    );
    expect(query.params).toEqual([30]);
  });
});
