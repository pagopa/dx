#!/usr/bin/env tsx
/** This module is the DX metrics import entrypoint and orchestrator. */

import {
  cleanStaleCheckpoints,
  completeCheckpoint,
  failCheckpoint,
  hasRecentCheckpoint,
  startCheckpoint,
} from "./lib/checkpoints";
import {
  CliUsageError,
  computeSinceDate,
  getHelpText,
  HelpRequestedError,
  type ImportCliOptions,
  parseArgs,
} from "./lib/cli";
import {
  loadImportConfig,
  resolveImportSettings,
  resolveOverlapDays,
} from "./lib/config";
import { computeCursorAt, resolveEntitySince } from "./lib/cursor";
import {
  closeImportContext,
  createImportContext,
  type ImportContext,
  seedConfig,
} from "./lib/import-context";
import {
  importCommitsForMember,
  importIacPrLeadTime,
} from "./lib/importers/commits";
import {
  importPullRequestReviews,
  importPullRequests,
} from "./lib/importers/pull-requests";
import {
  importCodeSearch,
  importDxPipelineUsages,
} from "./lib/importers/search";
import {
  captureTechRadarSnapshot,
  importTechRadarRepositoryUsages,
} from "./lib/importers/tech-radar";
import {
  importTerraformModules,
  importTerraformRegistryReleases,
} from "./lib/importers/terraform";
import { importTrackerCsv } from "./lib/importers/tracker";
import { importWorkflowRuns, importWorkflows } from "./lib/importers/workflows";

const readEnvironmentOverrides = () => ({
  DATABASE_URL: process.env.DATABASE_URL,
  GITHUB_APP_ID: process.env.GITHUB_APP_ID,
  GITHUB_APP_INSTALLATION_ID: process.env.GITHUB_APP_INSTALLATION_ID,
  GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
});

const readRuntimeEnvironment = (): NodeJS.ProcessEnv => ({
  ...process.env,
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

type RunWithCheckpoint = (
  entityType: string,
  repoName: null | string,
  task: (since: string) => Promise<void>,
) => Promise<boolean>;

const entityLabel = (entityType: string, repoName: null | string): string =>
  repoName ? `${entityType} (${repoName})` : entityType;

interface RunWithCheckpointOptions {
  args: ImportCliOptions;
  context: ImportContext;
  overlapDays: number;
  stats: { skipped: number };
}

/**
 * Builds the checkpoint- and cursor-aware runner shared by every entity step.
 * Extracted from `main` to keep the orchestrator readable and within lint
 * limits, and to keep the incremental policy in a single place.
 */
const createRunWithCheckpoint =
  ({
    args,
    context,
    overlapDays,
    stats,
  }: RunWithCheckpointOptions): RunWithCheckpoint =>
  async (
    entityType: string,
    repoName: null | string,
    task: (since: string) => Promise<void>,
  ): Promise<boolean> => {
    if (
      !args.force &&
      (await hasRecentCheckpoint(context, entityType, repoName))
    ) {
      console.log(
        `  ⏭ Skipping ${entityLabel(entityType, repoName)} — imported within the last 23h`,
      );
      stats.skipped += 1;
      return true;
    }

    const isRepositoryEntity =
      repoName !== null && context.repositories.includes(repoName);
    const repoId =
      repoName && isRepositoryEntity
        ? await context.ensureRepo(repoName)
        : null;

    // `--force` ignores the cursor and re-reads the whole floor window;
    // otherwise a stored cursor resumes from where the last import stopped.
    const since = args.force
      ? args.since
      : await resolveEntitySince(context, {
          entityType,
          floor: args.since,
          overlapDays,
          repoName,
        });

    const syncRunId = await startCheckpoint(
      context,
      entityType,
      repoName,
      since,
      repoId,
    );

    try {
      await task(since);
      const cursorAt = computeCursorAt(entityType);
      await completeCheckpoint(context, syncRunId, cursorAt);
      return true;
    } catch (error) {
      await failCheckpoint(context, syncRunId);
      console.error(`  ❌ Failed: ${error}`);
      return false;
    }
  };

interface RepositoryImportOptions {
  context: ImportContext;
  failedTechRadarRepositories: string[];
  repoName: string;
  runWithCheckpoint: RunWithCheckpoint;
  shouldRun: (entityType: string) => boolean;
}

/** Imports every per-repository entity for a single repository. */
const runRepositoryImport = async ({
  context,
  failedTechRadarRepositories,
  repoName,
  runWithCheckpoint,
  shouldRun,
}: RepositoryImportOptions): Promise<void> => {
  console.log(`\n📦 ${context.organization}/${repoName}`);

  if (shouldRun("pull-requests")) {
    await runWithCheckpoint("pull-requests", repoName, (since) =>
      importPullRequests(context, repoName, since),
    );
  }

  if (shouldRun("workflows")) {
    await runWithCheckpoint("workflows", repoName, () =>
      importWorkflows(context, repoName),
    );
  }

  if (shouldRun("workflow-runs")) {
    await runWithCheckpoint("workflow-runs", repoName, (since) =>
      importWorkflowRuns(context, repoName, since),
    );
  }

  if (shouldRun("iac-pr")) {
    await runWithCheckpoint("iac-pr", repoName, (since) =>
      importIacPrLeadTime(context, repoName, since),
    );
  }

  if (shouldRun("terraform-modules")) {
    await runWithCheckpoint("terraform-modules", repoName, () =>
      importTerraformModules(context, repoName),
    );
  }

  if (shouldRun("pr-reviews")) {
    await runWithCheckpoint("pr-reviews", repoName, (since) =>
      importPullRequestReviews(context, repoName, since),
    );
  }

  if (shouldRun("tech-radar")) {
    const succeeded = await runWithCheckpoint("tech-radar", repoName, () =>
      importTechRadarRepositoryUsages(context, repoName),
    );

    if (!succeeded) {
      failedTechRadarRepositories.push(repoName);
    }
  }
};

async function main(): Promise<void> {
  const overallStartTime = Date.now();
  const args = parseArgs(process.argv.slice(2), process.cwd());

  if (!args.since) {
    args.since = computeSinceDate(process.env.IMPORT_SINCE_DAYS);
  }
  const fileConfig = loadImportConfig(args.configPath);
  const settings = resolveImportSettings(
    fileConfig,
    readEnvironmentOverrides(),
  );

  if (args.repo && !settings.repositories.includes(args.repo)) {
    throw new CliUsageError(
      `Unknown repository "${args.repo}". Configured repositories: ${settings.repositories.join(", ")}.`,
    );
  }

  const overlapDays = resolveOverlapDays(process.env.IMPORT_OVERLAP_DAYS);
  const context = await createImportContext(settings, readRuntimeEnvironment());
  const repositories = args.repo ? [args.repo] : context.repositories;
  const stats = { skipped: 0 };

  try {
    console.log("\n🚀 DX Metrics Import");
    console.log(`   Since (floor): ${args.since}`);
    console.log(`   Entity: ${args.entity}`);
    console.log(`   Force: ${args.force}`);
    console.log(`   Organization: ${context.organization}`);
    console.log(`   Repositories: ${repositories.length}\n`);

    await cleanStaleCheckpoints(context);
    await seedConfig(context);

    const shouldRun = (entityType: string): boolean =>
      args.entity === "all" || args.entity === entityType;

    const runWithCheckpoint = createRunWithCheckpoint({
      args,
      context,
      overlapDays,
      stats,
    });

    // Repositories whose per-repo Techradar import failed this run. The
    // organisation-wide snapshot is skipped when any of them failed, so a
    // partial import is never recorded as complete.
    const failedTechRadarRepositories: string[] = [];

    for (const repoName of repositories) {
      await runRepositoryImport({
        context,
        failedTechRadarRepositories,
        repoName,
        runWithCheckpoint,
        shouldRun,
      });
    }

    // Organization-wide entities are not scoped to a repository, so a `--repo`
    // run skips them instead of mutating unrelated datasets and spending API
    // quota on repositories the caller did not ask for.
    const skipGlobalEntities = args.repo !== undefined;
    const shouldRunGlobal = (entityType: string): boolean =>
      !skipGlobalEntities && shouldRun(entityType);

    if (skipGlobalEntities) {
      console.log(
        "\n⏭ Skipping organization-wide entities — --repo scopes the run to one repository",
      );
    }

    // Captured once, after every repository has been imported, so the snapshot
    // reflects the full usage set. It has its own `tech-radar-snapshot`
    // checkpoint, so `--entity tech-radar` re-captures it even when all
    // per-repo steps are checkpoint-skipped. Skipped entirely when any
    // repository import failed, so a partial run is not published as complete.
    if (shouldRunGlobal("tech-radar")) {
      console.log("\n🎯 Techradar Snapshot");

      if (failedTechRadarRepositories.length > 0) {
        console.warn(
          `  ⏭ Skipping snapshot — Techradar import failed for ${failedTechRadarRepositories.length} repository(ies): ${failedTechRadarRepositories.join(", ")}`,
        );
      } else {
        await runWithCheckpoint("tech-radar-snapshot", null, () =>
          captureTechRadarSnapshot(context),
        );
      }
    }

    if (shouldRunGlobal("commits")) {
      console.log("\n🔍 DX Team Commits");
      for (const member of context.dxTeamMembers) {
        await runWithCheckpoint("commits", member, (since) =>
          importCommitsForMember(context, member, since),
        );
      }
    }

    if (shouldRunGlobal("code-search")) {
      console.log("\n🔍 Code Search (DX Adoption)");
      await runWithCheckpoint("code-search", null, () =>
        importCodeSearch(context),
      );
    }

    if (shouldRunGlobal("dx-pipelines")) {
      console.log("\n🔍 DX Pipeline Usages");
      await runWithCheckpoint("dx-pipelines", null, () =>
        importDxPipelineUsages(context),
      );
    }

    if (shouldRunGlobal("terraform-registry")) {
      console.log("\n📦 Terraform Registry");
      await runWithCheckpoint("terraform-registry", null, () =>
        importTerraformRegistryReleases(context),
      );
    }

    if (shouldRunGlobal("tracker") && args.trackerCsv) {
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
