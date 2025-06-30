import { getLogger } from "@logtape/logtape";
import { Command } from "commander";
import * as process from "node:process";

import { Dependencies } from "../../../domain/dependencies.js";
import { checkMonorepoScripts } from "../../../domain/package-json.js";

type DoctorDependencies = Pick<
  Dependencies,
  "packageJsonReader" | "repositoryReader"
>;

export const makeDoctorCommand = (
  dependencies: DoctorDependencies,
): Command => {
  const logger = getLogger(["dx-cli", "doctor"]);
  return new Command()
    .name("doctor")
    .description(
      "Verify the repository setup according to the DevEx guidelines",
    )
    .action(async () => {
      const { repositoryReader } = dependencies;

      const repoRoot = repositoryReader.findRepositoryRoot(process.cwd());
      if (!repoRoot) {
        logger.error(
          "❌ Could not find repository root. Make sure to have the repo initialized.",
        );
        return;
      }

      logger.info("Checking monorepo scripts...");
      await checkMonorepoScripts(repoRoot)(dependencies);
    });
};
