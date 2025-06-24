import { Command } from "commander";
import * as process from "node:process";

import { Dependencies } from "../domain/dependencies.js";
import { checkMonorepoScripts } from "../domain/node.js";

type DoctorDependencies = Pick<
  Dependencies,
  "nodeReader" | "repositoryReader" | "writer"
>;

export const makeDoctorCommand = (dependencies: DoctorDependencies): Command =>
  new Command()
    .name("doctor")
    .description("Checks the development environment")
    .action(async () => {
      const { repositoryReader, writer } = dependencies;

      const repoRoot = repositoryReader.findRepositoryRoot(process.cwd());
      if (!repoRoot) {
        writer.write(
          "❌ Could not find repository root. Make sure to have the repo initialized.",
        );
        return;
      }

      writer.write("Checking monorepo scripts...");
      await checkMonorepoScripts(repoRoot)(dependencies);
    });
