import { configure, getConsoleSink } from "@logtape/logtape";

import { makeCli } from "./adapters/commander/index.js";
import { makePackageJsonReader } from "./adapters/node/package-json.js";
import { makeRepositoryReader } from "./adapters/node/repository.js";
import { Dependencies } from "./domain/dependencies.js";

const deps: Dependencies = {
  packageJsonReader: makePackageJsonReader(),
  repositoryReader: makeRepositoryReader(),
};

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

const program = makeCli(deps);

program.parse();
