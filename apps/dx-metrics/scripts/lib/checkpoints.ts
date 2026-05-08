/** This module manages checkpoint tracking for incremental imports. */

import { sql } from "drizzle-orm";

import type { ImportContext } from "./import-context";

// 23 hours keeps same-day retries idempotent without blocking the next daily run.
const checkpointFreshnessWindowMs = 23 * 60 * 60 * 1000;

const getCheckpointKey = (
  entityType: string,
  repoName: null | string,
): string => (repoName ? `${entityType}:${repoName}` : entityType);

const parseSinceDate = (since: string): Date | null => {
  const parsedSinceDate = new Date(`${since}T00:00:00.000Z`);

  return Number.isNaN(parsedSinceDate.getTime()) ? null : parsedSinceDate;
};

export async function cleanStaleCheckpoints(
  context: ImportContext,
): Promise<void> {
  await context.db.execute(
    sql`UPDATE sync_runs SET status = 'interrupted', completed_at = NOW()
        WHERE status = 'running'`,
  );
}

export async function completeCheckpoint(
  context: ImportContext,
  syncRunId: number,
): Promise<void> {
  await context.db.execute(
    sql`UPDATE sync_runs SET status = 'done', completed_at = NOW()
        WHERE id = ${syncRunId}`,
  );
}

export async function failCheckpoint(
  context: ImportContext,
  syncRunId: number,
): Promise<void> {
  await context.db.execute(
    sql`UPDATE sync_runs SET status = 'failed', completed_at = NOW()
        WHERE id = ${syncRunId}`,
  );
}

export async function hasCheckpoint(
  context: ImportContext,
  entityType: string,
  repoName: null | string,
  since: string,
): Promise<boolean> {
  const requestedSinceDate = parseSinceDate(since);
  const checkpointKey = getCheckpointKey(entityType, repoName);

  if (!requestedSinceDate) {
    return false;
  }

  const freshCheckpointCutoff = new Date(
    Date.now() - checkpointFreshnessWindowMs,
  );

  const rows = await context.db.execute<{ has_checkpoint: number }>(
    sql`SELECT 1 AS has_checkpoint
        FROM sync_runs
        WHERE entity_type = ${checkpointKey}
          AND status = 'done'
          AND since_date IS NOT NULL
          AND completed_at IS NOT NULL
          AND since_date = ${requestedSinceDate}
          AND completed_at >= ${freshCheckpointCutoff}
        LIMIT 1`,
  );

  return rows.rows.length > 0;
}

export async function startCheckpoint(
  context: ImportContext,
  entityType: string,
  repoName: null | string,
  since: string,
  repoId: null | number,
): Promise<number> {
  const checkpointKey = getCheckpointKey(entityType, repoName);
  const requestedSinceDate = parseSinceDate(since);

  if (!requestedSinceDate) {
    throw new Error(`Invalid since date: ${since}`);
  }

  const rows = await context.db.execute<{ id: number }>(
    sql`INSERT INTO sync_runs (entity_type, repository_id, since_date, status)
        VALUES (${checkpointKey}, ${repoId}, ${requestedSinceDate}, 'running')
        RETURNING id`,
  );

  return rows.rows[0].id;
}
