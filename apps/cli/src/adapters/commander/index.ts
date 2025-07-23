import { Command } from "commander";

import { Config } from "../../config.js";
import { Dependencies } from "../../domain/dependencies.js";
import { makeDoctorCommand } from "./commands/doctor.js";
import { makeInfoCommand } from "./commands/info.js";
import { makeVersionCommand } from "./commands/version.js";

export const makeCli = (deps: Dependencies, config: Config) => {
  const program = new Command();

  program
    .name("dx")
    .description("The CLI for DX-Platform")
    .version(__CLI_VERSION__);

  program.addCommand(makeDoctorCommand(deps, config));
  program.addCommand(makeVersionCommand());
  program.addCommand(makeInfoCommand(dependencies, config));

  return program;
};
