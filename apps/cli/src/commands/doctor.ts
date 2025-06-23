import { Command } from "commander";

import { Dependencies } from "../domain/dependencies.js";

type DoctorDependencies = Pick<Dependencies, "writer">;

export const makeDoctorCommand = (dependencies: DoctorDependencies): Command =>
  new Command()
    .name("doctor")
    .description("Checks the development environment")
    .action(() => {
      dependencies.writer.write("Doctor command executed!");
    });
