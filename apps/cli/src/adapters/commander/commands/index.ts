import { Command } from "commander";

import { Dependencies } from "../../../domain/dependencies.js";
import { makeDoctorCommand } from "./doctor.js";

export const makeCli = (dependencies: Dependencies) => {
  const program = new Command();

  program
    .name("dx")
    .description("The CLI for DX-Platform")
    .version(__CLI_VERSION__);

  program.addCommand(makeDoctorCommand(dependencies));

  return program;
};
