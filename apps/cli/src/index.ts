import { Command } from "commander";

import { makeConsoleWriter } from "./adapters/console/index.js";
import { doctor } from "./commands/index.js";
import { Dependencies } from "./domain/dependencies.js";

const deps: Dependencies = {
  writer: makeConsoleWriter(),
};

const program = new Command();

program
  .name("DX-CLI")
  .description("The CLI for DX-Platform")
  .version(__CLI_VERSION__);

program.addCommand(doctor(deps));

program.parse();
