import { Command } from "commander";

import { Config } from "../../config.js";
import { Dependencies } from "../../domain/dependencies.js";
import { makeDoctorCommand } from "./commands/doctor.js";
import { makeVersionCommand } from "./commands/version.js";

export const makeCli = (dependencies: Dependencies, config: Config) => {
  const program = new Command();

  program
    .name("dx")
    .description("The CLI for DX-Platform")
    .version(__CLI_VERSION__);

  program.addCommand(makeDoctorCommand(dependencies, config));
  program.addCommand(makeVersionCommand());

  return program;
};
