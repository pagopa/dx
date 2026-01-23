import "core-js/actual/set/index.js";
import { Octokit } from "octokit";

import codemodRegistry from "./adapters/codemods/index.js";
import { makeCli } from "./adapters/commander/index.js";
import { makeValidationReporter } from "./adapters/logtape/validation-reporter.js";
import { makePackageJsonReader } from "./adapters/node/package-json.js";
import { makeRepositoryReader } from "./adapters/node/repository.js";
import { OctokitGitHubService } from "./adapters/octokit/index.js";
import { makeTfvarsService } from "./adapters/tfvars/index.js";
import { getConfig } from "./config.js";
import { Dependencies } from "./domain/dependencies.js";
import { getInfo } from "./domain/info.js";
import { applyCodemodById } from "./use-cases/apply-codemod.js";
import { listCodemods } from "./use-cases/list-codemods.js";
import { requestAzureAuthorization } from "./use-cases/request-azure-authorization.js";

export const runCli = (version: string) => {
  // Creating the adapters
  const repositoryReader = makeRepositoryReader();
  const packageJsonReader = makePackageJsonReader();
  const validationReporter = makeValidationReporter();
  const tfvarsService = makeTfvarsService();

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  const gitHubService = new OctokitGitHubService(octokit);

  const deps: Dependencies = {
    gitHubService,
    packageJsonReader,
    repositoryReader,
    tfvarsService,
    validationReporter,
  };

  const config = getConfig();

  const useCases = {
    applyCodemodById: applyCodemodById(codemodRegistry, getInfo(deps)),
    listCodemods: listCodemods(codemodRegistry),
    requestAzureAuthorization: requestAzureAuthorization(
      gitHubService,
      tfvarsService,
    ),
  };

  const program = makeCli(deps, config, useCases, version);

  program.parse();
};
