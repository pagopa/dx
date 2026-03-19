/** This module imports GitHub workflow definitions and workflow runs. */

import yaml from "js-yaml";

import type { ImportContext } from "../import-context";

import * as schema from "../../../src/db/schema";
import { formatSecondsElapsed } from "../importer-helpers";

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
        id: workflowRun.id,
        repositoryId: repoId,
        status: workflowRun.status || null,
        updatedAt: new Date(workflowRun.updated_at),
        workflowId: workflowRun.workflow_id,
      })
      .onConflictDoUpdate({
        set: {
          conclusion: workflowRun.conclusion || null,
          status: workflowRun.status || null,
          updatedAt: new Date(workflowRun.updated_at),
        },
        target: schema.workflowRuns.id,
      });

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

  console.log(
    `    ✓ ${importedCount} workflow runs imported in ${formatSecondsElapsed(startTime)}s`,
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
