/**
 * Incremental cursors for the DX metrics importer.
 *
 * The importer used to re-download the whole `--since` window on every run. It
 * now persists, per entity and repository, the time up to which it has imported
 * (`sync_runs.cursor_at`) and resumes from there. A repository with no history
 * still starts from the `--since` floor, so adding a new repository backfills it
 * without re-downloading the ones already imported.
 */

import { sql, type SQLWrapper } from "drizzle-orm";

import { getCheckpointKey } from "./checkpoints";
import { DEFAULT_OVERLAP_DAYS } from "./config";

/** Narrow database surface used by the cursor helpers (mirrors checkpoints). */
export interface CursorContext {
  db: {
    execute: (
      query: SQLWrapper,
    ) => Promise<{ rows: readonly Record<string, unknown>[] }>;
  };
}

/**
 * Entities whose importer fetches a time window (`since`) and can therefore
 * resume from a cursor. Full-list and replace-style entities (workflows,
 * terraform modules/registry, code-search, dx-pipelines, tech-radar, tracker)
 * have no window and always start from the floor.
 */
const INCREMENTAL_ENTITIES: ReadonlySet<string> = new Set([
  "commits",
  "iac-pr",
  "pr-reviews",
  "pull-requests",
  "workflow-runs",
]);

const toDate = (value: unknown): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));

  return Number.isNaN(date.getTime()) ? null : date;
};

/** Whether an entity can resume incrementally from a stored cursor. */
export const hasCursorSource = (entityType: string): boolean =>
  INCREMENTAL_ENTITIES.has(entityType);

/** Inputs for {@link resolveSince}. */
export interface ResolveSinceInput {
  readonly cursorAt: Date | null;
  readonly floor: string;
  readonly now?: Date;
  readonly overlapDays?: number;
}

/**
 * Computes the effective `--since` from a cursor and the configured floor.
 *
 * With a cursor, the window starts `overlapDays` before it (never in the
 * future). Without one — a new repository or entity — the floor is used, which
 * is how a newly added repository gets backfilled.
 */
export const resolveSince = ({
  cursorAt,
  floor,
  now = new Date(),
  overlapDays = DEFAULT_OVERLAP_DAYS,
}: ResolveSinceInput): string => {
  if (cursorAt === null || Number.isNaN(cursorAt.getTime())) {
    return floor;
  }

  const start = new Date(cursorAt);
  start.setUTCDate(start.getUTCDate() - overlapDays);

  const capped = start.getTime() > now.getTime() ? now : start;

  return capped.toISOString().slice(0, 10);
};

/** Reads the newest persisted cursor for an entity/repository, if any. */
export const getLatestCursorAt = async (
  context: CursorContext,
  entityType: string,
  repoName: null | string,
): Promise<Date | null> => {
  const result = await context.db.execute(
    sql`SELECT cursor_at AS "cursorAt"
        FROM sync_runs
        WHERE entity_type = ${getCheckpointKey(entityType, repoName)}
          AND status = 'done'
          AND cursor_at IS NOT NULL
        ORDER BY completed_at DESC NULLS LAST
        LIMIT 1`,
  );

  return toDate(result.rows[0]?.cursorAt);
};

/** Inputs for {@link resolveEntitySince}. */
export interface ResolveEntitySinceInput {
  readonly entityType: string;
  readonly floor: string;
  readonly now?: Date;
  readonly overlapDays?: number;
  readonly repoName: null | string;
}

/**
 * Resolves the `--since` an entity/repository run should start from: the stored
 * cursor minus the overlap, or the floor when there is no history yet.
 */
export const resolveEntitySince = async (
  context: CursorContext,
  { entityType, floor, now, overlapDays, repoName }: ResolveEntitySinceInput,
): Promise<string> => {
  if (!hasCursorSource(entityType)) {
    return floor;
  }

  const cursorAt = await getLatestCursorAt(context, entityType, repoName);

  return resolveSince({ cursorAt, floor, now, overlapDays });
};

/**
 * Cursor to persist after a successful run: the time up to which the window was
 * imported. Storing the run time rather than the newest data timestamp matters
 * because an inactive repository's newest row never advances; using it would
 * make every run re-scan an ever-widening, empty window.
 */
export const computeCursorAt = (entityType: string): Date | null =>
  hasCursorSource(entityType) ? new Date() : null;
