import { Command } from "commander";

import { Dependencies } from "../domain/dependencies.js";
import { checkMonorepoScripts } from "../domain/node.js";

type DoctorDependencies = Pick<Dependencies, "nodeReader" | "writer">;

export const makeDoctorCommand = (dependencies: DoctorDependencies): Command =>
  new Command()
    .name("doctor")
    .description("Checks the development environment")
    .action(async () => {
      const cwd = process.cwd();

      const { writer } = dependencies;
      writer.write("Checking monorepo scripts...");

      await checkMonorepoScripts(cwd)(dependencies);
    });
