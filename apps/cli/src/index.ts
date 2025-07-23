import "core-js/actual/set/index.js";
import { configure, getConsoleSink, getLogger } from "@logtape/logtape";

import { makeCli } from "./adapters/commander/index.js";
import { makeValidationReporter } from "./adapters/logtape/validation-reporter.js";
import { makePackageJsonReader } from "./adapters/node/package-json.js";
import { makeRepositoryReader } from "./adapters/node/repository.js";
import { getConfig } from "./config.js";
import { Dependencies } from "./domain/dependencies.js";

await configure({
  loggers: [
    { category: ["dx-cli"], lowestLevel: "info", sinks: ["console"] },
    {
      category: ["logtape", "meta"],
      lowestLevel: "warning",
      sinks: ["console"],
    },
  ],
  sinks: { console: getConsoleSink() },
});

const logger = getLogger(["dx-cli"]);
// Creating the adapters
const repositoryReader = makeRepositoryReader();
const packageJsonReader = makePackageJsonReader();
const validationReporter = makeValidationReporter();

// Read once the package.json file in the repo root
const repoPackageJson = await repositoryReader
  .findRepositoryRoot(process.cwd())
  .andThen(packageJsonReader.readPackageJson);

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

const config = getConfig();

const program = makeCli(deps, config);

program.parse();
