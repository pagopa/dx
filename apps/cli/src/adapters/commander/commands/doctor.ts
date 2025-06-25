import { Command } from "commander";
import * as process from "node:process";

import { Dependencies } from "../../../domain/dependencies.js";
import { checkMonorepoScripts } from "../../../domain/node.js";

type DoctorDependencies = Pick<
  Dependencies,
  "logger" | "nodeReader" | "repositoryReader"
>;

export const makeDoctorCommand = (dependencies: DoctorDependencies): Command =>
  new Command()
    .name("doctor")
    .description(
      "Verify the repository setup according to the DevEx guidelines",
    )
    .action(async () => {
      const { logger, repositoryReader } = dependencies;

      const repoRoot = repositoryReader.findRepositoryRoot(process.cwd());
      if (!repoRoot) {
        logger.error(
          "Could not find repository root. Make sure to have the repo initialized.",
        );
        return;
      }

      logger.log("Checking monorepo scripts...");
      await checkMonorepoScripts(repoRoot)(dependencies);
    });
