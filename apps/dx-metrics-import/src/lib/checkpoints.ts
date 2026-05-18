/** This module manages checkpoint tracking for incremental imports. */

import { sql, type SQLWrapper } from "drizzle-orm";
import { z } from "zod/v4";

// 23 hours keeps same-day retries idempotent without blocking the next daily run.
const checkpointFreshnessWindowMs = 23 * 60 * 60 * 1000;
const sinceDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const checkpointIdRowSchema = z.object({ id: z.number() });

export interface CheckpointContext {
  db: {
    execute: (
      query: SQLWrapper,
    ) => Promise<{ rows: readonly Record<string, unknown>[] }>;
  };
}

const getCheckpointKey = (
  entityType: string,
  repoName: null | string,
): string => (repoName ? `${entityType}:${repoName}` : entityType);

const formatSinceDate = (sinceDate: Date): string =>
  sinceDate.toISOString().slice(0, 10);

const parseSinceDate = (since: string): Date | null => {
  if (!sinceDatePattern.test(since)) {
    return null;
  }

  const parsedSinceDate = new Date(`${since}T00:00:00.000Z`);

  if (Number.isNaN(parsedSinceDate.getTime())) {
    return null;
  }

  return formatSinceDate(parsedSinceDate) === since ? parsedSinceDate : null;
};

const parseCheckpointId = (
  row: Record<string, unknown> | undefined,
): number => {
  const parsedRow = checkpointIdRowSchema.safeParse(row);

  if (!parsedRow.success) {
    throw new Error("Failed to read checkpoint id from database response", {
      cause: parsedRow.error,
    });
  }

  return parsedRow.data.id;
};

export async function cleanStaleCheckpoints(
  context: CheckpointContext,
): Promise<void> {
  await context.db.execute(
    sql`UPDATE sync_runs SET status = 'interrupted', completed_at = NOW()
        WHERE status = 'running'`,
  );
}

export async function completeCheckpoint(
  context: CheckpointContext,
  syncRunId: number,
): Promise<void> {
  await context.db.execute(
    sql`UPDATE sync_runs SET status = 'done', completed_at = NOW()
        WHERE id = ${syncRunId}`,
  );
}

export async function failCheckpoint(
  context: CheckpointContext,
  syncRunId: number,
): Promise<void> {
  await context.db.execute(
    sql`UPDATE sync_runs SET status = 'failed', completed_at = NOW()
        WHERE id = ${syncRunId}`,
  );
}

export async function hasCheckpoint(
  context: CheckpointContext,
  entityType: string,
  repoName: null | string,
  since: string,
): Promise<boolean> {
  const requestedSinceDate = parseSinceDate(since);
  const checkpointKey = getCheckpointKey(entityType, repoName);

  if (!requestedSinceDate) {
    return false;
  }

  const normalizedSinceDate = formatSinceDate(requestedSinceDate);
  const freshCheckpointCutoff = new Date(
    Date.now() - checkpointFreshnessWindowMs,
  );

  const rows = await context.db.execute(
    sql`SELECT 1 AS has_checkpoint
        FROM sync_runs
        WHERE entity_type = ${checkpointKey}
          AND status = 'done'
          AND since_date IS NOT NULL
          AND completed_at IS NOT NULL
          AND since_date::date = ${normalizedSinceDate}::date
          AND completed_at >= ${freshCheckpointCutoff}
        LIMIT 1`,
  );

  return rows.rows.length > 0;
}

export async function startCheckpoint(
  context: CheckpointContext,
  entityType: string,
  repoName: null | string,
  since: string,
  repoId: null | number,
): Promise<number> {
  const checkpointKey = getCheckpointKey(entityType, repoName);
  const requestedSinceDate = parseSinceDate(since);

  if (!requestedSinceDate) {
    throw new Error(
      `Invalid since date: ${since}. Expected format: YYYY-MM-DD`,
    );
  }

  const rows = await context.db.execute(
    sql`INSERT INTO sync_runs (entity_type, repository_id, since_date, status)
        VALUES (${checkpointKey}, ${repoId}, ${requestedSinceDate}, 'running')
        RETURNING id`,
  );

  return parseCheckpointId(rows.rows[0]);
}
