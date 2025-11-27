import "core-js/actual/set/index.js";
import { configure, getConsoleSink } from "@logtape/logtape";

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

const deps: Dependencies = {
  packageJsonReader,
  repositoryReader,
  validationReporter,
};

// Try to find the repository root (optional for some commands)
const repoRoot = await repositoryReader.findRepositoryRoot(process.cwd());
const repositoryRoot = repoRoot.unwrapOr(process.cwd());

const config = getConfig();

const useCases = {
  applyCodemodById: applyCodemodById(
    codemodRegistry,
    getInfo(deps, config, repositoryRoot),
  ),
  listCodemods: listCodemods(codemodRegistry),
};

const program = makeCli(deps, config, repositoryRoot, useCases);

program.parse();
