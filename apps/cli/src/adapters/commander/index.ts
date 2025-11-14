import { Command } from "commander";

import { Config } from "../../config.js";
import { Dependencies } from "../../domain/dependencies.js";
import {
  CodemodCommandDependencies,
  makeCodemodCommand,
} from "./commands/codemod.js";
import { makeDoctorCommand } from "./commands/doctor.js";
import { makeInfoCommand } from "./commands/info.js";
import { makeInitCommand } from "./commands/init.js";
import { makeVersionCommand } from "./commands/version.js";

export type CliDependencies = CodemodCommandDependencies;

export const makeCli = (
  deps: Dependencies,
  config: Config,
  cliDeps: CliDependencies,
) => {
  const program = new Command();

  program
    .name("dx")
    .description("The CLI for DX-Platform")
    .version(__CLI_VERSION__);

  program.addCommand(makeDoctorCommand(deps, config));
  program.addCommand(makeCodemodCommand(cliDeps));
  program.addCommand(makeInitCommand());
  program.addCommand(makeVersionCommand());
  program.addCommand(makeInfoCommand(deps, config));

  return program;
};
