/** This module manages checkpoint tracking for incremental imports. */

import { sql } from "drizzle-orm";
import type { ImportContext } from "./import-context";

const getCheckpointKey = (
  entityType: string,
  repoName: string | null,
): string => (repoName ? `${entityType}:${repoName}` : entityType);

export async function hasCheckpoint(
  context: ImportContext,
  entityType: string,
  repoName: string | null,
  since: string,
): Promise<boolean> {
  const requestedSinceDate = new Date(since);
  const checkpointKey = getCheckpointKey(entityType, repoName);

  if (Number.isNaN(requestedSinceDate.getTime())) {
    return false;
  }

  const rows = await context.db.execute<{ has_checkpoint: number }>(
    sql`SELECT 1 AS has_checkpoint
        FROM sync_runs
        WHERE entity_type = ${checkpointKey}
          AND status = 'done'
          AND since_date IS NOT NULL
          AND completed_at IS NOT NULL
          AND since_date <= ${requestedSinceDate}
          AND completed_at >= ${requestedSinceDate}
        LIMIT 1`,
  );

  return rows.rows.length > 0;
}

export async function startCheckpoint(
  context: ImportContext,
  entityType: string,
  repoName: string | null,
  since: string,
  repoId: number | null,
): Promise<number> {
  const checkpointKey = getCheckpointKey(entityType, repoName);
  const rows = await context.db.execute<{ id: number }>(
    sql`INSERT INTO sync_runs (entity_type, repository_id, since_date, status)
        VALUES (${checkpointKey}, ${repoId}, ${new Date(since)}, 'running')
        RETURNING id`,
  );

  return rows.rows[0].id;
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

export async function cleanStaleCheckpoints(
  context: ImportContext,
): Promise<void> {
  await context.db.execute(
    sql`UPDATE sync_runs SET status = 'interrupted', completed_at = NOW()
        WHERE status = 'running'`,
  );
}
