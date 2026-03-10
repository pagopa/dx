#!/usr/bin/env tsx
/** This module is the DX metrics import entrypoint and orchestrator. */

import {
  cleanStaleCheckpoints,
  completeCheckpoint,
  failCheckpoint,
  hasCheckpoint,
  startCheckpoint,
} from "./lib/checkpoints";
import {
  CliUsageError,
  getHelpText,
  HelpRequestedError,
  parseArgs,
} from "./lib/cli";
import {
  loadImportConfig,
  resolveImportSettings,
} from "./lib/config";
import {
  closeImportContext,
  createImportContext,
  seedConfig,
} from "./lib/import-context";
import {
  importCommitsForMember,
  importIacPrLeadTime,
} from "./lib/importers/commits";
import {
  importPullRequests,
  importPullRequestReviews,
} from "./lib/importers/pull-requests";
import {
  importCodeSearch,
  importDxPipelineUsages,
} from "./lib/importers/search";
import {
  importTerraformModules,
  importTerraformRegistryReleases,
} from "./lib/importers/terraform";
import { importTrackerCsv } from "./lib/importers/tracker";
import {
  importWorkflows,
  importWorkflowRuns,
} from "./lib/importers/workflows";

const readEnvironmentOverrides = () => ({
  ORGANIZATION: process.env.ORGANIZATION,
  REPOSITORIES: process.env.REPOSITORIES,
  DX_TEAM_MEMBERS: process.env.DX_TEAM_MEMBERS,
  DX_REPO: process.env.DX_REPO,
  DATABASE_URL: process.env.DATABASE_URL,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
});

const handleCliError = (error: unknown): never => {
  if (error instanceof HelpRequestedError) {
    console.log(getHelpText());
    process.exit(0);
  }

  if (error instanceof CliUsageError) {
    console.error(error.message);
    console.log(getHelpText());
    process.exit(1);
  }

  throw error;
};

async function main(): Promise<void> {
  const overallStartTime = Date.now();
  const args = parseArgs(process.argv.slice(2), process.cwd());
  const fileConfig = loadImportConfig(args.configPath);
  const settings = resolveImportSettings(fileConfig, readEnvironmentOverrides());
  const context = await createImportContext(settings);
  const stats = { skipped: 0 };

  try {
    console.log("\n🚀 DX Metrics Import");
    console.log(`   Since: ${args.since}`);
    console.log(`   Entity: ${args.entity}`);
    console.log(`   Force: ${args.force}`);
    console.log(`   Organization: ${context.organization}`);
    console.log(`   Repositories: ${context.repositories.length}\n`);

    await cleanStaleCheckpoints(context);
    await seedConfig(context);

    const shouldRun = (entityType: string): boolean =>
      args.entity === "all" || args.entity === entityType;

    const runWithCheckpoint = async (
      entityType: string,
      repoName: string | null,
      task: () => Promise<void>,
    ): Promise<void> => {
      if (
        !args.force &&
        (await hasCheckpoint(context, entityType, repoName, args.since))
      ) {
        const label = repoName ? `${entityType} (${repoName})` : entityType;
        console.log(
          `  ⏭ Skipping ${label} — already imported for --since ${args.since}`,
        );
        stats.skipped += 1;
        return;
      }

      const isRepositoryEntity =
        repoName !== null && context.repositories.includes(repoName);
      const repoId =
        repoName && isRepositoryEntity ? await context.ensureRepo(repoName) : null;
      const syncRunId = await startCheckpoint(
        context,
        entityType,
        repoName,
        args.since,
        repoId,
      );

      try {
        await task();
        await completeCheckpoint(context, syncRunId);
      } catch (error) {
        await failCheckpoint(context, syncRunId);
        console.error(`  ❌ Failed: ${error}`);
      }
    };

    for (const repoName of context.repositories) {
      console.log(`\n📦 ${context.organization}/${repoName}`);

      if (shouldRun("pull-requests")) {
        await runWithCheckpoint("pull-requests", repoName, () =>
          importPullRequests(context, repoName, args.since),
        );
      }

      if (shouldRun("workflows")) {
        await runWithCheckpoint("workflows", repoName, () =>
          importWorkflows(context, repoName),
        );
      }

      if (shouldRun("workflow-runs")) {
        await runWithCheckpoint("workflow-runs", repoName, () =>
          importWorkflowRuns(context, repoName, args.since),
        );
      }

      if (shouldRun("iac-pr")) {
        await runWithCheckpoint("iac-pr", repoName, () =>
          importIacPrLeadTime(context, repoName, args.since),
        );
      }

      if (shouldRun("terraform-modules")) {
        await runWithCheckpoint("terraform-modules", repoName, () =>
          importTerraformModules(context, repoName),
        );
      }

      if (shouldRun("pr-reviews")) {
        await runWithCheckpoint("pr-reviews", repoName, () =>
          importPullRequestReviews(context, repoName, args.since),
        );
      }
    }

    if (shouldRun("commits")) {
      console.log("\n🔍 DX Team Commits");
      for (const member of context.dxTeamMembers) {
        await runWithCheckpoint("commits", member, () =>
          importCommitsForMember(context, member, args.since),
        );
      }
    }

    if (shouldRun("code-search")) {
      console.log("\n🔍 Code Search (DX Adoption)");
      await runWithCheckpoint("code-search", null, () =>
        importCodeSearch(context),
      );
    }

    if (shouldRun("dx-pipelines")) {
      console.log("\n🔍 DX Pipeline Usages");
      await runWithCheckpoint("dx-pipelines", null, () =>
        importDxPipelineUsages(context),
      );
    }

    if (shouldRun("terraform-registry")) {
      console.log("\n📦 Terraform Registry");
      await runWithCheckpoint("terraform-registry", null, () =>
        importTerraformRegistryReleases(context),
      );
    }

    if (shouldRun("tracker") && args.trackerCsv) {
      console.log("\n📋 Tracker");
      await runWithCheckpoint("tracker", null, () =>
        importTrackerCsv(context, args.trackerCsv),
      );
    }

    const overallElapsed = ((Date.now() - overallStartTime) / 1000).toFixed(1);
    console.log(`\n${"=".repeat(50)}`);
    console.log("✅ Import complete!");
    console.log("\n📊 Summary:");
    console.log(`   Total time: ${overallElapsed}s`);
    console.log(`   Tasks skipped: ${stats.skipped}`);
    console.log();
  } finally {
    await closeImportContext(context);
  }
}

main().catch((error) => {
  if (error instanceof HelpRequestedError || error instanceof CliUsageError) {
    handleCliError(error);
  }

  console.error("Fatal error:", error);
  process.exit(1);
});
