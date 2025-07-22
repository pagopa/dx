import { Command } from "commander";

import { Config } from "../../config.js";
import { CliEnv } from "../../domain/cli.js";
import { makeDoctorCommand } from "./commands/doctor.js";
import { makeVersionCommand } from "./commands/version.js";

export const makeCli = (env: CliEnv, config: Config) => {
  const program = new Command();

  program
    .name("dx")
    .description("The CLI for DX-Platform")
    .version(__CLI_VERSION__);

  program.addCommand(makeDoctorCommand(env, config));
  program.addCommand(makeVersionCommand(env));

  return program;
};
