import { makeCli } from "./adapters/commander/index.js";
import { makeConsoleLogger } from "./adapters/console/index.js";
import { makeNodeReader } from "./adapters/node/index.js";
import { makeRepositoryReader } from "./adapters/node/repository.js";
import { Dependencies } from "./domain/dependencies.js";

const deps: Dependencies = {
  logger: makeConsoleLogger(),
  nodeReader: makeNodeReader(),
  repositoryReader: makeRepositoryReader(),
};

const program = makeCli(deps);

program.parse();
