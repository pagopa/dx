import { makeCli } from "./adapters/commander/index.js";
import { makeConsoleLogger } from "./adapters/console/index.js";
import { makePackageJsonReader } from "./adapters/node/package-json.js";
import { makeRepositoryReader } from "./adapters/node/repository.js";
import { Dependencies } from "./domain/dependencies.js";

const deps: Dependencies = {
  logger: makeConsoleLogger(),
  packageJsonReader: makePackageJsonReader(),
  repositoryReader: makeRepositoryReader(),
};

const program = makeCli(deps);

program.parse();
