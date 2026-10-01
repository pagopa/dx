/** This module imports GitHub workflow definitions and workflow runs. */

import * as schema from "@pagopa/dx-metrics-core/schema";
import { sql } from "drizzle-orm";
import yaml from "js-yaml";

import type { ImportContext } from "../import-context";

import { errorStatus, formatSecondsElapsed } from "../importer-helpers";

type WorkflowRunItem = Awaited<
  ReturnType<
    ImportContext["octokit"]["rest"]["actions"]["listWorkflowRunsForRepo"]
  >
>["data"]["workflow_runs"][number];

/**
 * Runs older than this cannot be reconciled: GitHub deletes workflow runs after
 * its retention window (90 days by default), so refreshing them would only
 * produce repeated 404s.
 */
const RECONCILE_LOOKBACK_DAYS = 90;

/**
 * Runs the database still believes are active, refreshed by id.
 *
 * Discovering active runs by status alone races with completion: a run that
 * finishes between two status queries disappears from every active result and,
 * once it is older than the incremental window, would never be fetched again.
 * Re-reading the ids the database holds closes that gap, because a run imported
 * as active in any previous run stays a reconciliation candidate until it is
 * stored as completed.
 */
const refreshStoredActiveWorkflowRuns = async (
  context: ImportContext,
  repoName: string,
  repoId: number,
): Promise<number> => {
  const cutoff = new Date(
    Date.now() - RECONCILE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  );

  const storedRuns = await context.db
    .select({ id: schema.workflowRuns.id })
    .from(schema.workflowRuns)
    .where(
      sql`${schema.workflowRuns.repositoryId} = ${repoId}
          AND (${schema.workflowRuns.status} IS NULL
               OR LOWER(TRIM(${schema.workflowRuns.status})) <> 'completed')
          AND ${schema.workflowRuns.createdAt} >= ${cutoff}`,
    );

  let failed = 0;
  let refreshed = 0;

  for (const storedRun of storedRuns) {
    try {
      const { data } = await context.octokit.rest.actions.getWorkflowRun({
        owner: context.organization,
        repo: repoName,
        run_id: storedRun.id,
      });

      await upsertWorkflowRun(context, repoId, data);
      refreshed += 1;
    } catch (error) {
      // A run deleted on GitHub can no longer be reconciled; any other failure
      // leaves stored state stale and must be retried.
      if (errorStatus(error) !== 404) {
        failed += 1;
      }
    }
  }

  if (failed > 0) {
    throw new Error(
      `${failed} workflow run reconciliations failed; the window will be retried`,
    );
  }

  return refreshed;
};

const upsertWorkflowRun = async (
  context: ImportContext,
  repoId: number,
  workflowRun: WorkflowRunItem,
): Promise<void> => {
  await context.db
    .insert(schema.workflows)
    .values({
      id: workflowRun.workflow_id,
      name: workflowRun.name || "unknown",
      pipeline: null,
      repositoryId: repoId,
    })
    .onConflictDoNothing();

  await context.db
    .insert(schema.workflowRuns)
    .values({
      conclusion: workflowRun.conclusion || null,
      createdAt: new Date(workflowRun.created_at),
      event: workflowRun.event || null,
      id: workflowRun.id,
      repositoryId: repoId,
      status: workflowRun.status || null,
      triggeringActor: workflowRun.triggering_actor?.login ?? null,
      updatedAt: new Date(workflowRun.updated_at),
      workflowId: workflowRun.workflow_id,
    })
    .onConflictDoUpdate({
      set: {
        conclusion: workflowRun.conclusion || null,
        event: workflowRun.event || null,
        status: workflowRun.status || null,
        triggeringActor: workflowRun.triggering_actor?.login ?? null,
        updatedAt: new Date(workflowRun.updated_at),
      },
      target: schema.workflowRuns.id,
    });
};

export async function importWorkflowRuns(
  context: ImportContext,
  repoName: string,
  since: string,
): Promise<void> {
  const startTime = Date.now();
  const repoId = await context.ensureRepo(repoName);
  const fullName = `${context.organization}/${repoName}`;
  console.log(`  Importing workflow runs for ${fullName}...`);

  let fetchedCount = 0;
  const workflowRuns = await context.octokit.paginate(
    context.octokit.rest.actions.listWorkflowRunsForRepo,
    {
      created: `>=${since}`,
      owner: context.organization,
      per_page: 100,
      repo: repoName,
    },
    (response) => {
      fetchedCount += response.data.length;
      process.stdout.write(`\r    Fetching runs: ${fetchedCount}...`);
      return response.data;
    },
  );
  process.stdout.write(`\r    Fetched ${fetchedCount} runs total\n`);

  let importedCount = 0;
  for (const workflowRun of workflowRuns) {
    await upsertWorkflowRun(context, repoId, workflowRun);

    importedCount += 1;
    if (importedCount % 50 === 0) {
      process.stdout.write(
        `\r    Imported: ${importedCount}/${workflowRuns.length}`,
      );
    }
  }

  if (importedCount > 0) {
    process.stdout.write(
      `\r    Imported: ${importedCount}/${workflowRuns.length}\n`,
    );
  }

  // Performed after the window so a run that completed since it was last
  // imported is refreshed even though it is no longer inside the window.
  const reconciledCount = await refreshStoredActiveWorkflowRuns(
    context,
    repoName,
    repoId,
  );
  console.log(`    Reconciled ${reconciledCount} active runs`);

  console.log(
    `    ✓ ${importedCount} workflow runs imported, ${reconciledCount} reconciled in ${formatSecondsElapsed(startTime)}s`,
  );
}

export async function importWorkflows(
  context: ImportContext,
  repoName: string,
): Promise<void> {
  const startTime = Date.now();
  const repoId = await context.ensureRepo(repoName);
  const fullName = `${context.organization}/${repoName}`;
  console.log(`  Importing workflows for ${fullName}...`);

  const workflows = await context.octokit.paginate(
    context.octokit.rest.actions.listRepoWorkflows,
    {
      owner: context.organization,
      per_page: 100,
      repo: repoName,
    },
  );
  console.log(`    Found ${workflows.length} workflows`);

  let importedCount = 0;
  for (const workflow of workflows) {
    let pipelineContent: null | string = workflow.path || null;

    try {
      const { data: fileData } = await context.octokit.rest.repos.getContent({
        owner: context.organization,
        path: workflow.path,
        repo: repoName,
      });

      if ("content" in fileData && fileData.content) {
        const decoded = Buffer.from(fileData.content, "base64").toString(
          "utf-8",
        );
        const parsed = yaml.load(decoded);
        pipelineContent = JSON.stringify(parsed);
      }
    } catch {
      pipelineContent = workflow.path || null;
    }

    await context.db
      .insert(schema.workflows)
      .values({
        id: workflow.id,
        name: workflow.name,
        pipeline: pipelineContent,
        repositoryId: repoId,
      })
      .onConflictDoUpdate({
        set: {
          name: workflow.name,
          pipeline: pipelineContent,
        },
        target: schema.workflows.id,
      });

    importedCount += 1;
  }

  console.log(
    `    ✓ ${importedCount} workflows imported in ${formatSecondsElapsed(startTime)}s`,
  );
}
