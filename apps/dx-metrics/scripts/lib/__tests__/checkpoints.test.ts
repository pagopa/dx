/** Tests for the checkpoint tracking module. */

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

const makeContext = (executeResult: { rows: unknown[] }) =>
  ({
    db: {
      execute: vi.fn().mockResolvedValue(executeResult),
    },
  }) as unknown as ImportContext;

describe("hasCheckpoint", () => {
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

  it("matches only checkpoints with the same since date and a fresh completion", async () => {
    const context = makeContext({ rows: [{ has_checkpoint: 1 }] });
    const result = await hasCheckpoint(
      context,
      "pull-requests",
      "dx",
      "2026-04-08",
    );

    const [statement] = vi.mocked(context.db.execute).mock.calls[0];
    const rendered = dialect.sqlToQuery(statement);

    expect(result).toBe(true);
    expect(rendered.sql).toContain("entity_type = $1");
    expect(rendered.sql).toContain("since_date = $2");
    expect(rendered.sql).not.toContain("since_date <=");
    expect(rendered.sql).toContain(
      "completed_at >= NOW() - INTERVAL '23 hours'",
    );
    expect(rendered.params).toEqual([
      "pull-requests:dx",
      new Date("2026-04-08"),
    ]);
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

    const [statement] = vi.mocked(context.db.execute).mock.calls[0];
    const rendered = dialect.sqlToQuery(statement);

    expect(result).toBe(true);
    expect(rendered.params).toEqual(["code-search", new Date("2026-04-08")]);
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
    expect(id).toBe(42);
    expect(context.db.execute).toHaveBeenCalledOnce();
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
