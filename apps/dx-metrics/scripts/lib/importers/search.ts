/** This module imports DX adoption data using GitHub code search. */

import { sql } from "drizzle-orm";
import * as schema from "../../../src/db/schema";
import type { ImportContext } from "../import-context";
import {
  escapeForRegularExpression,
  sleep,
} from "../importer-helpers";

const buildDxUsesPattern = (context: ImportContext): RegExp => {
  const workflowPrefix = `${context.organization}/${context.dxRepo}/.github/workflows/`;

  return new RegExp(
    `uses:\\s*(${escapeForRegularExpression(workflowPrefix)}([^@\\s"'\\n]+))(?:@([^\\s"'\\n]+))?`,
    "g",
  );
};

export async function importDxPipelineUsages(
  context: ImportContext,
): Promise<void> {
  console.log(
    `  Importing DX pipeline usages (code search for ${context.organization}/${context.dxRepo}/.github/workflows)...`,
  );

  const query = `${context.organization}/${context.dxRepo}/.github/workflows org:${context.organization} path:.github/workflows`;

  try {
    const results = await context.octokit.paginate(
      context.octokit.rest.search.code,
      {
        q: query,
        per_page: 100,
      },
    );
    console.log(`    Found ${results.length} workflow files referencing DX`);

    await context.db.execute(sql`TRUNCATE TABLE dx_pipeline_usages`);

    const dxUsesPattern = buildDxUsesPattern(context);
    let importedCount = 0;
    for (const result of results) {
      const repositoryFullName = result.repository?.full_name;
      const callerFile = result.path;
      const ownerLogin = result.repository?.owner?.login;
      const repositoryName = result.repository?.name;
      if (!repositoryFullName || !callerFile || !ownerLogin || !repositoryName) {
        continue;
      }

      let content = "";
      try {
        const { data: fileData } = await context.octokit.rest.repos.getContent({
          owner: ownerLogin,
          repo: repositoryName,
          path: callerFile,
        });
        if ("content" in fileData && fileData.content) {
          content = Buffer.from(fileData.content, "base64").toString("utf-8");
        }
      } catch {
        continue;
      }

      const matches = [...content.matchAll(dxUsesPattern)];
      for (const match of matches) {
        const dxWorkflow = match[1];
        const ref = match[3] ?? null;
        await context.db
          .insert(schema.dxPipelineUsages)
          .values({
            repository: repositoryFullName,
            callerFile,
            dxWorkflow,
            ref,
          })
          .onConflictDoNothing();
        importedCount += 1;
      }

      await sleep(200);
    }

    console.log(`    ✓ ${importedCount} DX pipeline usage records imported`);
  } catch (error) {
    console.log(`    ⚠ DX pipeline usages import failed: ${error}`);
    throw error;
  }
}

export async function importCodeSearch(context: ImportContext): Promise<void> {
  console.log("  Importing code search results (DX adoption)...");

  const query = `${context.organization}/${context.dxRepo} org:${context.organization}`;

  try {
    const results = await context.octokit.paginate(
      context.octokit.rest.search.code,
      {
        q: query,
        per_page: 100,
      },
    );

    await context.db
      .delete(schema.codeSearchResults)
      .where(sql`${schema.codeSearchResults.query} = ${query}`);

    let importedCount = 0;
    for (const result of results) {
      const repositoryFullName = result.repository?.full_name;
      if (!repositoryFullName) {
        continue;
      }

      await context.db
        .insert(schema.codeSearchResults)
        .values({
          query,
          repositoryFullName,
          path: result.path || null,
        })
        .onConflictDoNothing();

      importedCount += 1;
    }

    console.log(`    ✓ ${importedCount} code search results`);
  } catch (error) {
    console.log(`    ⚠ Code search failed: ${error}`);
  }
}
