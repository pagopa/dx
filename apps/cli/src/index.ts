import "core-js/actual/set/index.js";
import { configure, getConsoleSink, getLogger } from "@logtape/logtape";

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

const logger = getLogger(["dx-cli"]);
// Creating the adapters
const repositoryReader = makeRepositoryReader();
const packageJsonReader = makePackageJsonReader();
const validationReporter = makeValidationReporter();

// Find the repository root
const repoRoot = await repositoryReader.findRepositoryRoot(process.cwd());
if (repoRoot.isErr()) {
  logger.error(
    "Could not find repository root. Make sure to have the repo initialized.",
  );
  process.exit(1);
}
const repositoryRoot = repoRoot.value;

// Read the package.json file in the repo root
const repoPackageJson = await packageJsonReader.readPackageJson(repositoryRoot);

if (repoPackageJson.isErr()) {
  logger.error("Repository does not contain a package.json file");
  process.exit(1);
}
const packageJson = repoPackageJson.value;

const deps: Dependencies = {
  packageJson,
  packageJsonReader,
  repositoryReader,
  validationReporter,
};

const config = getConfig(repositoryRoot);

const useCases = {
  applyCodemodById: applyCodemodById(codemodRegistry, getInfo(deps, config)),
  listCodemods: listCodemods(codemodRegistry),
};

const program = makeCli(deps, config, useCases);

program.parse();
