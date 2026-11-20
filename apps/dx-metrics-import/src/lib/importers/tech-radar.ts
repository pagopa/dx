/** This module imports Techradar tool usage data via direct file existence checks. */

import {
  TECH_RADAR_SNAPSHOT_MARKER_STATUS,
  TECH_RADAR_SNAPSHOT_MARKER_TOOL_KEY,
  TECH_RADAR_SNAPSHOT_MARKER_TOOL_NAME,
} from "@pagopa/dx-metrics-core/config";
import * as schema from "@pagopa/dx-metrics-core/schema";
import { count, inArray, sql } from "drizzle-orm";

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
 * tool/ring/status, scoped to the configured repositories so obsolete repos
 * cannot inflate the series. Must run after all repositories have been
 * imported, so the snapshot reflects the whole organisation. When nothing is
 * detected it still records a zero-valued marker, so a drop to zero stays
 * visible in the trend instead of looking like a missing snapshot.
 */
export async function captureTechRadarSnapshot(
  context: ImportContext,
): Promise<void> {
  const configuredFullNames = context.repositories.map(
    (name) => `${context.organization}/${name}`,
  );

  const grouped = await context.db
    .select({
      radarRing: schema.techRadarUsages.radarRing,
      radarStatus: schema.techRadarUsages.radarStatus,
      repositoryCount: count(),
      toolKey: schema.techRadarUsages.toolKey,
      toolName: schema.techRadarUsages.toolName,
    })
    .from(schema.techRadarUsages)
    .where(
      inArray(schema.techRadarUsages.repositoryFullName, configuredFullNames),
    )
    .groupBy(
      schema.techRadarUsages.toolKey,
      schema.techRadarUsages.toolName,
      schema.techRadarUsages.radarStatus,
      schema.techRadarUsages.radarRing,
    );

  const capturedAt = new Date();

  if (grouped.length === 0) {
    await context.db.insert(schema.techRadarSnapshots).values({
      capturedAt,
      radarRing: null,
      radarStatus: TECH_RADAR_SNAPSHOT_MARKER_STATUS,
      repositoryCount: 0,
      toolKey: TECH_RADAR_SNAPSHOT_MARKER_TOOL_KEY,
      toolName: TECH_RADAR_SNAPSHOT_MARKER_TOOL_NAME,
    });

    console.log("  ✓ Techradar snapshot recorded (0 usages, marker row)");
    return;
  }

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
