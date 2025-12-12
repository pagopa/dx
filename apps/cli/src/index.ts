import "core-js/actual/set/index.js";
import { configure, getConsoleSink } from "@logtape/logtape";
import { Octokit } from "octokit";

import codemodRegistry from "./adapters/codemods/index.js";
import { makeCli } from "./adapters/commander/index.js";
import { makeValidationReporter } from "./adapters/logtape/validation-reporter.js";
import { makePackageJsonReader } from "./adapters/node/package-json.js";
import { makeRepositoryReader } from "./adapters/node/repository.js";
import { getConfig } from "./config.js";
import { Dependencies } from "./domain/dependencies.js";
import { getInfo } from "./domain/info.js";
import { applyCodemodById } from "./use-cases/apply-codemod.js";
import { listCodemods } from "./use-cases/list-codemods.js";

await configure({
  loggers: [
    { category: ["dx-cli"], lowestLevel: "info", sinks: ["console"] },
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

// Creating the adapters
const repositoryReader = makeRepositoryReader();
const packageJsonReader = makePackageJsonReader();
const validationReporter = makeValidationReporter();
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const deps: Dependencies = {
  octokit,
  packageJsonReader,
  repositoryReader,
  validationReporter,
};

const config = getConfig();

const useCases = {
  applyCodemodById: applyCodemodById(codemodRegistry, getInfo(deps)),
  listCodemods: listCodemods(codemodRegistry),
};

const program = makeCli(deps, config, useCases);

program.parse();
