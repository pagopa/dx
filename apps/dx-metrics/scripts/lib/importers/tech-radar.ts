/** This module imports Techradar tool usage data with GitHub code search. */

import { sql } from "drizzle-orm";

import type { ImportContext } from "../import-context";

import * as schema from "../../../src/db/schema";
import { sleep } from "../importer-helpers";
import { loadTechRadarTools } from "./tech-radar-catalog";

const SEARCH_THROTTLE_MS = 150;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

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
    const searchQuery = tool.buildSearchQuery(repositoryFullName);

    try {
      const response = await context.octokit.rest.search.code({
        per_page: 1,
        q: searchQuery,
      });
      const match = response.data.items[0];

      if (!match?.path) {
        await sleep(SEARCH_THROTTLE_MS);
        continue;
      }

      await context.db
        .insert(schema.techRadarUsages)
        .values({
          evidencePath: match.path,
          radarRef: tool.radarRef,
          radarRing: tool.radarRing,
          radarSlug: tool.radarSlug,
          radarStatus: tool.radarStatus,
          radarTitle: tool.radarTitle,
          repositoryFullName,
          repositoryId,
          searchQuery,
          toolKey: tool.key,
          toolName: tool.toolName,
        })
        .onConflictDoUpdate({
          set: {
            detectedAt: new Date(),
            evidencePath: match.path,
            radarRef: tool.radarRef,
            radarRing: tool.radarRing,
            radarSlug: tool.radarSlug,
            radarStatus: tool.radarStatus,
            radarTitle: tool.radarTitle,
            searchQuery,
            toolName: tool.toolName,
          },
          target: [
            schema.techRadarUsages.repositoryFullName,
            schema.techRadarUsages.toolKey,
          ],
        });

      detectedTools += 1;
      console.log(`    ✓ ${tool.toolName}: ${match.path}`);
      await sleep(SEARCH_THROTTLE_MS);
    } catch (error) {
      throw new Error(
        `Techradar detection failed for ${repositoryFullName} / ${tool.toolName}: ${getErrorMessage(error)}`,
      );
    }
  }

  console.log(`    ✓ ${detectedTools} Techradar tools detected`);
}
