import "core-js/actual/set/index.js";
import { AzureCliCredential } from "@azure/identity";
import { configure, getConsoleSink } from "@logtape/logtape";
import * as assert from "node:assert/strict";
import { Octokit } from "octokit";

import { AzureSubscriptionRepository } from "./adapters/azure/cloud-account-repository.js";
import { AzureCloudAccountService } from "./adapters/azure/cloud-account-service.js";
import codemodRegistry from "./adapters/codemods/index.js";
import { makeCli } from "./adapters/commander/index.js";
import { makeValidationReporter } from "./adapters/logtape/validation-reporter.js";
import { makePackageJsonReader } from "./adapters/node/package-json.js";
import { makeRepositoryReader } from "./adapters/node/repository.js";
import {
  getGitHubPAT,
  OctokitGitHubService,
} from "./adapters/octokit/index.js";
import { makeAzureAuthorizationService } from "./adapters/pagopa-technology/azure-authorization.js";
import { type PlopDependencies } from "./adapters/plop/dependencies.js";
import { makeRealWorkspaceEffects } from "./adapters/workspace/real-workspace-effects.js";
import { getConfig } from "./config.js";
import { Dependencies } from "./domain/dependencies.js";
import { getInfo } from "./domain/info.js";
import { type WorkspaceEffects } from "./domain/workspace-effects.js";
import {
  FakeCloudAccountRepository,
  FakeCloudAccountService,
  FakeGitHubService,
  makeFakeReleaseClient,
  makeFakeWorkspaceEffects,
} from "./sandbox/fakes.js";
import { loadFixture } from "./sandbox/fixture.js";
import { type SandboxState } from "./sandbox/state.js";
import { applyCodemodById } from "./use-cases/apply-codemod.js";
import { listCodemods } from "./use-cases/list-codemods.js";
import { requestAuthorization } from "./use-cases/request-authorization.js";

/**
 * Returns `true` when `-v` or `--verbose` is present in argv.
 *
 * We inspect argv directly — instead of relying on Commander — because the
 * logtape configuration must be in place before any command handler runs
 * (including the ones that emit debug logs while parsing prompts).
 */
const detectVerboseFromArgv = (argv: readonly string[]): boolean =>
  argv.includes("-v") || argv.includes("--verbose");

/**
 * Returns `true` when `--dry-run` is present in argv.
 * Detected early to skip credential resolution.
 */
const detectDryRunFromArgv = (argv: readonly string[]): boolean =>
  argv.includes("--dry-run");

const configureLogging = async (verbose: boolean): Promise<void> => {
  const level = verbose ? "debug" : "info";
  await configure({
    loggers: [
      { category: ["dx-cli"], lowestLevel: level, sinks: ["console"] },
      { category: ["gen"], lowestLevel: level, sinks: ["console"] },
      { category: ["savemoney"], lowestLevel: "debug", sinks: ["console"] },
      { category: ["json"], lowestLevel: "info", sinks: ["rawJson"] },
      {
        category: ["logtape", "meta"],
        lowestLevel: "warning",
        sinks: ["console"],
      },
    ],
    sinks: {
      console: getConsoleSink(),
      rawJson(record) {
        console.log(record.rawMessage);
      },
    },
  });
};

const buildDryRunRuntime = async (): Promise<{
  deps: Dependencies;
  plopDependencies: PlopDependencies;
  sandboxState: SandboxState;
  workspaceEffects: WorkspaceEffects;
}> => {
  const sandboxState = await loadFixture();
  const gitHubService = new FakeGitHubService(sandboxState);
  const cloudAccountRepository = new FakeCloudAccountRepository(sandboxState);
  const cloudAccountService = new FakeCloudAccountService(sandboxState);
  const releaseClient = makeFakeReleaseClient();
  const workspaceEffects = makeFakeWorkspaceEffects(sandboxState);

  const plopDependencies: PlopDependencies = {
    cloudAccountRepository,
    cloudAccountService,
    gitHubService,
    releaseClient,
  };

  // In dry-run, authorization is a no-op that returns a fake result
  const authorizationService = makeAzureAuthorizationService(gitHubService);

  const deps: Dependencies = {
    authorizationService,
    gitHubService,
    packageJsonReader: makePackageJsonReader(),
    repositoryReader: makeRepositoryReader(),
    validationReporter: makeValidationReporter(),
  };

  return { deps, plopDependencies, sandboxState, workspaceEffects };
};

const buildNormalRuntime = async (): Promise<{
  deps: Dependencies;
  plopDependencies: PlopDependencies;
  workspaceEffects: WorkspaceEffects;
}> => {
  const auth = await getGitHubPAT();

  assert.ok(
    auth,
    "GitHub PAT is required. Please set the GH_TOKEN environment variable or login using GitHub CLI.",
  );

  const octokit = new Octokit({ auth });
  const gitHubService = new OctokitGitHubService(octokit);
  const authorizationService = makeAzureAuthorizationService(gitHubService);

  const credential = new AzureCliCredential();
  const cloudAccountRepository = new AzureSubscriptionRepository(credential);
  const cloudAccountService = new AzureCloudAccountService(credential);

  const plopDependencies: PlopDependencies = {
    cloudAccountRepository,
    cloudAccountService,
    gitHubService,
    releaseClient: octokit,
  };

  const workspaceEffects = makeRealWorkspaceEffects(gitHubService);

  const deps: Dependencies = {
    authorizationService,
    gitHubService,
    packageJsonReader: makePackageJsonReader(),
    repositoryReader: makeRepositoryReader(),
    validationReporter: makeValidationReporter(),
  };

  return { deps, plopDependencies, workspaceEffects };
};

export const runCli = async (version: string) => {
  await configureLogging(detectVerboseFromArgv(process.argv));

  const dryRun = detectDryRunFromArgv(process.argv);

  const { deps, plopDependencies, workspaceEffects } = dryRun
    ? await buildDryRunRuntime()
    : await buildNormalRuntime();

  const config = getConfig();

  const useCases = {
    applyCodemodById: applyCodemodById(codemodRegistry, getInfo(deps)),
    listCodemods: listCodemods(codemodRegistry),
    requestAuthorization: requestAuthorization(deps.authorizationService),
  };

  const program = makeCli(
    deps,
    config,
    useCases,
    plopDependencies,
    workspaceEffects,
    version,
  );

  if (dryRun) {
    console.log("🧪 DRY-RUN mode — no real side effects on GitHub or Azure\n");
  }

  program.parse();
};
