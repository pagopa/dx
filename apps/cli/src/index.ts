import "core-js/actual/set/index.js";
import { configure, getConsoleSink } from "@logtape/logtape";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { Octokit } from "octokit";

import codemodRegistry from "./adapters/codemods/index.js";
import { makeCli } from "./adapters/commander/index.js";
import { makePackageJsonReader } from "./adapters/node/package-json.js";
import { makeRepositoryReader } from "./adapters/node/repository.js";
import {
  getGitHubPAT,
  OctokitGitHubService,
} from "./adapters/octokit/index.js";
import { makeAzureAuthorizationService } from "./adapters/pagopa-technology/azure-authorization.js";
import { getConfig } from "./config.js";
import { getInfo } from "./domain/info.js";
import { applyCodemodById } from "./use-cases/apply-codemod.js";
import { listCodemods } from "./use-cases/list-codemods.js";

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

  const repositoryReader = makeRepositoryReader();
  const packageJsonReader = makePackageJsonReader();

  /**
   * Lazily creates GitHub-authenticated services on first call.
   * Only commands that actually need GitHub (init, add) will trigger this,
   * so credential-free commands (spec, doctor, info, …) never require a PAT.
   */
  const requireGitHubAuth = () =>
    ResultAsync.fromPromise(
      getGitHubPAT(),
      (cause) => new Error("Failed to read GitHub PAT", { cause }),
    ).andThen((auth) => {
      if (!auth) {
        return errAsync(
          new Error(
            "GitHub PAT is required. Please set the GH_TOKEN environment variable or login using GitHub CLI.",
          ),
        );
      }
      const octokit = new Octokit({ auth });
      const gitHubService = new OctokitGitHubService(octokit);
      const authorizationService = makeAzureAuthorizationService(gitHubService);
      return okAsync({ authorizationService, gitHubService });
    });

  const deps = {
    packageJsonReader,
    repositoryReader,
    requireGitHubAuth,
  };

  const config = getConfig();

  const useCases = {
    applyCodemodById: applyCodemodById(codemodRegistry, getInfo(deps)),
    listCodemods: listCodemods(codemodRegistry),
  };

  const program = makeCli(deps, config, useCases, version);

  program.parse();
};
