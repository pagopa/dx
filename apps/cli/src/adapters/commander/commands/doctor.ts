import { getLogger } from "@logtape/logtape";
import { Command } from "commander";
import * as process from "node:process";

import { Dependencies } from "../../../domain/dependencies.js";
import { checkMonorepoScripts } from "../../../domain/package-json.js";

type DoctorDependencies = Pick<
  Dependencies,
  "packageJsonReader" | "repositoryReader" | "validationReporter"
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
      const { repositoryReader, validationReporter } = dependencies;

      const repoRootResult = repositoryReader.findRepositoryRoot(process.cwd());
      if (repoRootResult.isErr()) {
        logger.error(`❌ ${repoRootResult.error.message}`);
        process.exit(1);
      }

      const { value: repoRoot } = repoRootResult;

      logger.info("Checking monorepo scripts...");
      const result = await checkMonorepoScripts(repoRoot)(dependencies);

      validationReporter.reportValidationResult(result);
    });
};
