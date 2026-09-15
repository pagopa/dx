/** This module imports Techradar tool usage data via direct file existence checks. */

import * as schema from "@pagopa/dx-metrics-core/schema";
import { count, sql } from "drizzle-orm";

import type { ImportContext } from "../import-context";

import { sleep } from "../importer-helpers";
import { loadTechRadarTools } from "./tech-radar-catalog";

const CONTENT_THROTTLE_MS = 150;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isNotFoundError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "status" in error &&
  error.status === 404;

/**
 * Records the current Techradar adoption as one snapshot row per
 * tool/ring/status. Must run after all repositories have been imported, so the
 * snapshot reflects the whole organisation.
 */
export async function captureTechRadarSnapshot(
  context: ImportContext,
): Promise<void> {
  const grouped = await context.db
    .select({
      radarRing: schema.techRadarUsages.radarRing,
      radarStatus: schema.techRadarUsages.radarStatus,
      repositoryCount: count(),
      toolKey: schema.techRadarUsages.toolKey,
      toolName: schema.techRadarUsages.toolName,
    })
    .from(schema.techRadarUsages)
    .groupBy(
      schema.techRadarUsages.toolKey,
      schema.techRadarUsages.toolName,
      schema.techRadarUsages.radarStatus,
      schema.techRadarUsages.radarRing,
    );

  if (grouped.length === 0) {
    console.log("  ⏭ Techradar snapshot skipped — no usages recorded");
    return;
  }

  const capturedAt = new Date();
  await context.db.insert(schema.techRadarSnapshots).values(
    grouped.map((row) => ({
      capturedAt,
      radarRing: row.radarRing,
      radarStatus: row.radarStatus,
      repositoryCount: row.repositoryCount,
      toolKey: row.toolKey,
      toolName: row.toolName,
    })),
  );

  console.log(`  ✓ Techradar snapshot recorded (${grouped.length} rows)`);
}

export async function importTechRadarRepositoryUsages(
  context: ImportContext,
  repositoryName: string,
): Promise<void> {
  const repositoryFullName = `${context.organization}/${repositoryName}`;
  const repositoryId = await context.ensureRepo(repositoryName);
  const tools = await loadTechRadarTools();

  console.log(`  Importing Techradar usages for ${repositoryFullName}...`);

  await context.db
    .delete(schema.techRadarUsages)
    .where(
      sql`${schema.techRadarUsages.repositoryFullName} = ${repositoryFullName}`,
    );

  let detectedTools = 0;

  for (const tool of tools) {
    const storedCheckPath = `path:${tool.path}`;

    try {
      const response = await context.octokit.rest.repos.getContent({
        owner: context.organization,
        path: tool.path,
        repo: repositoryName,
      });

      if (!("path" in response.data)) {
        await sleep(CONTENT_THROTTLE_MS);
        continue;
      }

      await context.db
        .insert(schema.techRadarUsages)
        .values({
          evidencePath: response.data.path,
          radarRef: tool.radarRef,
          radarRing: tool.radarRing,
          radarSlug: tool.radarSlug,
          radarStatus: tool.radarStatus,
          radarTitle: tool.radarTitle,
          repositoryFullName,
          repositoryId,
          // We keep the existing column for auditability while switching away
          // from GitHub Search API to direct content existence checks.
          searchQuery: storedCheckPath,
          toolKey: tool.key,
          toolName: tool.toolName,
        })
        .onConflictDoUpdate({
          set: {
            detectedAt: new Date(),
            evidencePath: response.data.path,
            radarRef: tool.radarRef,
            radarRing: tool.radarRing,
            radarSlug: tool.radarSlug,
            radarStatus: tool.radarStatus,
            radarTitle: tool.radarTitle,
            searchQuery: storedCheckPath,
            toolName: tool.toolName,
          },
          target: [
            schema.techRadarUsages.repositoryFullName,
            schema.techRadarUsages.toolKey,
          ],
        });

      detectedTools += 1;
      console.log(`    ✓ ${tool.toolName}: ${response.data.path}`);
      await sleep(CONTENT_THROTTLE_MS);
    } catch (error) {
      if (isNotFoundError(error)) {
        await sleep(CONTENT_THROTTLE_MS);
        continue;
      }

      throw new Error(
        `Techradar detection failed for ${repositoryFullName} / ${tool.toolName}: ${getErrorMessage(error)}`,
        { cause: error },
      );
    }
  }

  console.log(`    ✓ ${detectedTools} Techradar tools detected`);
}
