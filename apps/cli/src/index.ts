import "core-js/actual/set/index.js";
import { configure, getConsoleSink } from "@logtape/logtape";
import * as assert from "node:assert/strict";
import { Octokit } from "octokit";

import codemodRegistry from "./adapters/codemods/index.js";
import { makeCli } from "./adapters/commander/index.js";
import { makeValidationReporter } from "./adapters/logtape/validation-reporter.js";
import { makePackageJsonReader } from "./adapters/node/package-json.js";
import { makeRepositoryReader } from "./adapters/node/repository.js";
import {
  getGitHubPAT,
  OctokitGitHubService,
} from "./adapters/octokit/index.js";
import { makeAuthorizationService } from "./adapters/pagopa-technology/authorization.js";
import { getConfig } from "./config.js";
import { Dependencies } from "./domain/dependencies.js";
import { getInfo } from "./domain/info.js";
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

const configureLogging = async (verbose: boolean): Promise<void> => {
  const level = verbose ? "debug" : "info";
  await configure({
    loggers: [
      { category: ["dx-cli"], lowestLevel: level, sinks: ["console"] },
      // The environment generator (`gen.env`) emits debug messages about
      // provisioned Azure resources; surfacing them is the main value of
      // `--verbose` when running `dx init` / `dx add environment`.
      { category: ["gen"], lowestLevel: level, sinks: ["console"] },
      // `savemoney` already emits structured debug output by default.
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

export const runCli = async (version: string) => {
  await configureLogging(detectVerboseFromArgv(process.argv));

  // Creating the adapters
  const repositoryReader = makeRepositoryReader();
  const packageJsonReader = makePackageJsonReader();
  const validationReporter = makeValidationReporter();

  const auth = await getGitHubPAT();

  assert.ok(
    auth,
    "GitHub PAT is required. Please set the GH_TOKEN environment variable or login using GitHub CLI.",
  );

  const octokit = new Octokit({
    auth,
  });

  const gitHubService = new OctokitGitHubService(octokit);
  const authorizationService = makeAuthorizationService(gitHubService);

  const deps: Dependencies = {
    authorizationService,
    gitHubService,
    packageJsonReader,
    repositoryReader,
    validationReporter,
  };

  const config = getConfig();

  const useCases = {
    applyCodemodById: applyCodemodById(codemodRegistry, getInfo(deps)),
    listCodemods: listCodemods(codemodRegistry),
    requestAuthorization: requestAuthorization(authorizationService),
  };

  const program = makeCli(deps, config, useCases, version);

  program.parse();
};
