/** Tests for the checkpoint tracking module. */

import { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

import {
  cleanStaleCheckpoints,
  completeCheckpoint,
  failCheckpoint,
  hasCheckpoint,
  startCheckpoint,
} from "../checkpoints";
import type { ImportContext } from "../import-context";

const dialect = new PgDialect();

const renderExecutedSql = (context: ImportContext) => {
  const [statement] = vi.mocked(context.db.execute).mock.calls[0] ?? [];

  if (!(statement instanceof SQL)) {
    throw new Error("Expected a SQL statement");
  }

  return dialect.sqlToQuery(statement);
};

const makeContext = (executeResult: { rows: unknown[] }) =>
  ({
    db: {
      execute: vi.fn().mockResolvedValue(executeResult),
    },
  }) as unknown as ImportContext;

describe("hasCheckpoint", () => {
  it("normalizes the since date and computes the freshness cutoff in code", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-08T12:00:00.000Z"));

    const context = makeContext({ rows: [{ has_checkpoint: 1 }] });
    const result = await hasCheckpoint(
      context,
      "pull-requests",
      "dx",
      "2026-04-08",
    );
    const rendered = renderExecutedSql(context);

    expect(result).toBe(true);
    expect(rendered.sql).toContain("entity_type =");
    expect(rendered.sql).toContain("since_date =");
    expect(rendered.sql).not.toContain("since_date <=");
    expect(rendered.sql).toContain("completed_at >=");
    expect(rendered.sql).not.toContain("INTERVAL '23 hours'");
    expect(rendered.params).toEqual([
      "pull-requests:dx",
      new Date("2026-04-08T00:00:00.000Z"),
      new Date("2026-05-07T13:00:00.000Z"),
    ]);

    vi.useRealTimers();
  });

  it("returns false when since date is invalid", async () => {
    const context = makeContext({ rows: [] });
    const result = await hasCheckpoint(
      context,
      "pull-requests",
      "dx",
      "not-a-date",
    );
    expect(result).toBe(false);
    expect(context.db.execute).not.toHaveBeenCalled();
  });

  it("returns false when no matching checkpoint exists in db", async () => {
    const context = makeContext({ rows: [] });
    const result = await hasCheckpoint(
      context,
      "pull-requests",
      "dx",
      "2026-04-08",
    );
    expect(result).toBe(false);
  });

  it("returns false when no global checkpoint exists (null repoName)", async () => {
    const context = makeContext({ rows: [] });
    const result = await hasCheckpoint(
      context,
      "code-search",
      null,
      "2026-04-08",
    );
    expect(result).toBe(false);
  });

  it("uses the global entity key when repoName is null", async () => {
    const context = makeContext({ rows: [{ has_checkpoint: 1 }] });
    const result = await hasCheckpoint(
      context,
      "code-search",
      null,
      "2026-04-08",
    );
    const rendered = renderExecutedSql(context);

    expect(result).toBe(true);
    expect(rendered.params[0]).toBe("code-search");
    expect(rendered.params[1]).toEqual(new Date("2026-04-08T00:00:00.000Z"));
  });
});

describe("cleanStaleCheckpoints", () => {
  it("updates running sync_runs to interrupted", async () => {
    const context = makeContext({ rows: [] });
    await cleanStaleCheckpoints(context);
    expect(context.db.execute).toHaveBeenCalledOnce();
  });
});

describe("startCheckpoint", () => {
  it("inserts a running sync_run and returns its id", async () => {
    const context = makeContext({ rows: [{ id: 42 }] });
    const id = await startCheckpoint(
      context,
      "pull-requests",
      "dx",
      "2026-04-08",
      1,
    );
    const rendered = renderExecutedSql(context);

    expect(id).toBe(42);
    expect(context.db.execute).toHaveBeenCalledOnce();
    expect(rendered.params).toEqual([
      "pull-requests:dx",
      1,
      new Date("2026-04-08T00:00:00.000Z"),
    ]);
  });

  it("throws when since date is invalid", async () => {
    const context = makeContext({ rows: [] });

    await expect(
      startCheckpoint(context, "pull-requests", "dx", "not-a-date", 1),
    ).rejects.toThrow("Invalid since date: not-a-date");
    expect(context.db.execute).not.toHaveBeenCalled();
  });
});

describe("completeCheckpoint", () => {
  it("updates the sync_run to done", async () => {
    const context = makeContext({ rows: [] });
    await completeCheckpoint(context, 42);
    expect(context.db.execute).toHaveBeenCalledOnce();
  });
});

describe("failCheckpoint", () => {
  it("updates the sync_run to failed", async () => {
    const context = makeContext({ rows: [] });
    await failCheckpoint(context, 42);
    expect(context.db.execute).toHaveBeenCalledOnce();
  });
});
