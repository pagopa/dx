import { Command } from "commander";

import { makeConsoleLogger } from "./adapters/console/index.js";
import { makeRepositoryReader } from "./adapters/node/index.js";
import { makeNodeReader } from "./adapters/yarn/index.js";
import { doctor } from "./commands/index.js";
import { Dependencies } from "./domain/dependencies.js";

const deps: Dependencies = {
  nodeReader: makeNodeReader(),
  repositoryReader: makeRepositoryReader(),
  writer: makeConsoleLogger(),
};

const program = new Command();

program
  .name("DX-CLI")
  .description("The CLI for DX-Platform")
  .version(__CLI_VERSION__);

program.addCommand(doctor(deps));

program.parse();
