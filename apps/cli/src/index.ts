import { configure, getConsoleSink } from "@logtape/logtape";

import { makeCli } from "./adapters/commander/index.js";
import { makeValidationReporter } from "./adapters/logtape/validation-reporter.js";
import { makePackageJsonReader } from "./adapters/node/package-json.js";
import { makeRepositoryReader } from "./adapters/node/repository.js";
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

const deps: Dependencies = {
  packageJsonReader: makePackageJsonReader(),
  repositoryReader: makeRepositoryReader(),
  validationReporter: makeValidationReporter(),
};

const program = makeCli(deps);

program.parse();
