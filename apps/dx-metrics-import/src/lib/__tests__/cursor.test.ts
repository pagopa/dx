/** Tests for the incremental cursor module. */

import { SQL, type SQLWrapper } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

import {
  computeCursorAt,
  type CursorContext,
  getLatestCursorAt,
  hasCursorSource,
  resolveEntitySince,
  resolveSince,
} from "../cursor";

const dialect = new PgDialect();

const makeContext = <TRow extends Record<string, unknown>>(
  rows: readonly TRow[],
) => {
  const executeMock = vi.fn(
    async (query: SQLWrapper): Promise<{ rows: readonly TRow[] }> => {
      void query;
      return { rows: [...rows] };
    },
  );
  const execute: CursorContext["db"]["execute"] = (query) => executeMock(query);
  const context = { db: { execute } } satisfies CursorContext;

  return { context, executeMock };
};

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

describe("hasCursorSource", () => {
  it("recognizes entities with a date dimension", () => {
    expect(hasCursorSource("pull-requests")).toBe(true);
    expect(hasCursorSource("pr-reviews")).toBe(true);
    expect(hasCursorSource("workflow-runs")).toBe(true);
    expect(hasCursorSource("iac-pr")).toBe(true);
    expect(hasCursorSource("commits")).toBe(true);
  });

  it("returns false for full-list and replace-style entities", () => {
    expect(hasCursorSource("workflows")).toBe(false);
    expect(hasCursorSource("terraform-modules")).toBe(false);
    expect(hasCursorSource("tech-radar")).toBe(false);
    expect(hasCursorSource("code-search")).toBe(false);
  });
});

describe("resolveSince", () => {
  const now = new Date("2026-05-10T00:00:00.000Z");

  it("falls back to the floor without a cursor", () => {
    expect(resolveSince({ cursorAt: null, floor: "2024-01-01", now })).toBe(
      "2024-01-01",
    );
  });

  it("starts the overlap before the cursor", () => {
    expect(
      resolveSince({
        cursorAt: new Date("2026-05-08T10:00:00.000Z"),
        floor: "2024-01-01",
        now,
      }),
    ).toBe("2026-05-06");
  });

  it("honours a custom overlap", () => {
    expect(
      resolveSince({
        cursorAt: new Date("2026-05-08T10:00:00.000Z"),
        floor: "2024-01-01",
        now,
        overlapDays: 0,
      }),
    ).toBe("2026-05-08");
  });

  it("does not move the window into the future", () => {
    expect(
      resolveSince({
        cursorAt: new Date("2026-06-01T00:00:00.000Z"),
        floor: "2024-01-01",
        now,
      }),
    ).toBe("2026-05-10");
  });

  it("falls back to the floor for an invalid cursor", () => {
    expect(
      resolveSince({
        cursorAt: new Date("not-a-date"),
        floor: "2024-01-01",
        now,
      }),
    ).toBe("2024-01-01");
  });
});

describe("getLatestCursorAt", () => {
  it("returns the persisted cursor and reads it by checkpoint key", async () => {
    const cursorAt = new Date("2026-05-08T10:00:00.000Z");
    const { context, executeMock } = makeContext([{ cursorAt }]);

    const result = await getLatestCursorAt(context, "pull-requests", "dx");
    const rendered = renderExecutedSql(executeMock);

    expect(result).toEqual(cursorAt);
    expect(rendered.params).toEqual(["pull-requests:dx"]);
    expect(rendered.sql).toContain("cursor_at IS NOT NULL");
  });

  it("returns null when no completed run has a cursor", async () => {
    const { context } = makeContext([]);
    await expect(
      getLatestCursorAt(context, "pull-requests", "dx"),
    ).resolves.toBeNull();
  });

  it("uses the bare entity key for global entities", async () => {
    const { context, executeMock } = makeContext([{ cursorAt: null }]);
    await getLatestCursorAt(context, "code-search", null);
    const rendered = renderExecutedSql(executeMock);

    expect(rendered.params).toEqual(["code-search"]);
  });
});

describe("computeCursorAt", () => {
  it("returns null for entities without a cursor source", () => {
    expect(computeCursorAt("workflows")).toBeNull();
    expect(computeCursorAt("tech-radar")).toBeNull();
  });

  it("returns the run time for incremental entities", () => {
    const before = Date.now();
    const cursorAt = computeCursorAt("pull-requests");
    const after = Date.now();

    expect(cursorAt).toBeInstanceOf(Date);
    expect(cursorAt?.getTime()).toBeGreaterThanOrEqual(before);
    expect(cursorAt?.getTime()).toBeLessThanOrEqual(after);
  });
});

describe("resolveEntitySince", () => {
  it("returns the floor for entities without a cursor source", async () => {
    const { context, executeMock } = makeContext([]);
    const since = await resolveEntitySince(context, {
      entityType: "workflows",
      floor: "2024-01-01",
      repoName: "dx",
    });

    expect(since).toBe("2024-01-01");
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("resumes from the stored cursor minus the overlap", async () => {
    const { context } = makeContext([
      { cursorAt: new Date("2026-05-08T10:00:00.000Z") },
    ]);
    const since = await resolveEntitySince(context, {
      entityType: "pull-requests",
      floor: "2024-01-01",
      now: new Date("2026-05-10T00:00:00.000Z"),
      overlapDays: 2,
      repoName: "dx",
    });

    expect(since).toBe("2026-05-06");
  });

  it("backfills a new repository from the floor", async () => {
    const { context } = makeContext([]);
    const since = await resolveEntitySince(context, {
      entityType: "pull-requests",
      floor: "2024-01-01",
      repoName: "new-repo",
    });

    expect(since).toBe("2024-01-01");
  });
});
