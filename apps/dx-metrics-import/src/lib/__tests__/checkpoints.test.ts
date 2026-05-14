/** Tests for the checkpoint tracking module. */

import { SQL, type SQLWrapper } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type CheckpointContext,
  cleanStaleCheckpoints,
  completeCheckpoint,
  failCheckpoint,
  hasCheckpoint,
  startCheckpoint,
} from "../checkpoints";

const dialect = new PgDialect();

const renderExecutedSql = (
  executeMock: ReturnType<
    typeof makeContext<Record<string, unknown>>
  >["executeMock"],
) => {
  const firstCall = executeMock.mock.calls[0];

  if (!firstCall) {
    throw new Error("Expected execute to be called");
  }

  const [statement] = firstCall;

  if (!(statement instanceof SQL)) {
    throw new Error("Expected a SQL statement");
  }

  return dialect.sqlToQuery(statement);
};

const makeContext = <TRow extends Record<string, unknown>>(
  rows: readonly TRow[],
) => {
  const executeMock = vi.fn(
    async (query: SQLWrapper): Promise<{ rows: readonly TRow[] }> => {
      void query;
      return { rows: [...rows] };
    },
  );
  const execute: CheckpointContext["db"]["execute"] = (query) =>
    executeMock(query);
  const context = {
    db: {
      execute,
    },
  } satisfies CheckpointContext;

  return { context, executeMock };
};

afterEach(() => {
  vi.useRealTimers();
});

describe("hasCheckpoint", () => {
  it("normalizes the since date and computes the freshness cutoff in code", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-08T12:00:00.000Z"));

    const { context, executeMock } = makeContext([{ has_checkpoint: 1 }]);
    const result = await hasCheckpoint(
      context,
      "pull-requests",
      "dx",
      "2026-04-08",
    );
    const rendered = renderExecutedSql(executeMock);

    expect(result).toBe(true);
    expect(rendered.sql).toContain("entity_type =");
    expect(rendered.sql).toContain("since_date::date =");
    expect(rendered.sql).not.toContain("since_date <=");
    expect(rendered.sql).toContain("completed_at >=");
    expect(rendered.sql).not.toContain("INTERVAL '23 hours'");
    expect(rendered.params).toEqual([
      "pull-requests:dx",
      "2026-04-08",
      new Date("2026-05-07T13:00:00.000Z"),
    ]);
  });

  it("returns false when since date is invalid", async () => {
    const { context, executeMock } = makeContext([]);
    const result = await hasCheckpoint(
      context,
      "pull-requests",
      "dx",
      "not-a-date",
    );
    expect(result).toBe(false);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("returns false when the calendar date overflows", async () => {
    const { context, executeMock } = makeContext([]);
    const result = await hasCheckpoint(
      context,
      "pull-requests",
      "dx",
      "2026-02-31",
    );
    expect(result).toBe(false);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("returns false when no matching checkpoint exists in db", async () => {
    const { context } = makeContext([]);
    const result = await hasCheckpoint(
      context,
      "pull-requests",
      "dx",
      "2026-04-08",
    );
    expect(result).toBe(false);
  });

  it("returns false when no global checkpoint exists (null repoName)", async () => {
    const { context } = makeContext([]);
    const result = await hasCheckpoint(
      context,
      "code-search",
      null,
      "2026-04-08",
    );
    expect(result).toBe(false);
  });

  it("uses the global entity key when repoName is null", async () => {
    const { context, executeMock } = makeContext([{ has_checkpoint: 1 }]);
    const result = await hasCheckpoint(
      context,
      "code-search",
      null,
      "2026-04-08",
    );
    const rendered = renderExecutedSql(executeMock);

    expect(result).toBe(true);
    expect(rendered.params[0]).toBe("code-search");
    expect(rendered.params[1]).toBe("2026-04-08");
  });
});

describe("cleanStaleCheckpoints", () => {
  it("updates running sync_runs to interrupted", async () => {
    const { context, executeMock } = makeContext([]);
    await cleanStaleCheckpoints(context);
    expect(executeMock).toHaveBeenCalledOnce();
  });
});

describe("startCheckpoint", () => {
  it("inserts a running sync_run and returns its id", async () => {
    const { context, executeMock } = makeContext([{ id: 42 }]);
    const id = await startCheckpoint(
      context,
      "pull-requests",
      "dx",
      "2026-04-08",
      1,
    );
    const rendered = renderExecutedSql(executeMock);

    expect(id).toBe(42);
    expect(executeMock).toHaveBeenCalledOnce();
    expect(rendered.params).toEqual([
      "pull-requests:dx",
      1,
      new Date("2026-04-08T00:00:00.000Z"),
    ]);
  });

  it("throws when since date is invalid", async () => {
    const { context, executeMock } = makeContext([]);

    await expect(
      startCheckpoint(context, "pull-requests", "dx", "not-a-date", 1),
    ).rejects.toThrow(
      "Invalid since date: not-a-date. Expected format: YYYY-MM-DD",
    );
    expect(executeMock).not.toHaveBeenCalled();
  });
});

describe("completeCheckpoint", () => {
  it("updates the sync_run to done", async () => {
    const { context, executeMock } = makeContext([]);
    await completeCheckpoint(context, 42);
    expect(executeMock).toHaveBeenCalledOnce();
  });
});

describe("failCheckpoint", () => {
  it("updates the sync_run to failed", async () => {
    const { context, executeMock } = makeContext([]);
    await failCheckpoint(context, 42);
    expect(executeMock).toHaveBeenCalledOnce();
  });
});
