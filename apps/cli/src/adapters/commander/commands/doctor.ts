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

      const repoRoot = repositoryReader.findRepositoryRoot(process.cwd());
      if (!repoRoot) {
        logger.error(
          "❌ Could not find repository root. Make sure to have the repo initialized.",
        );
        process.exit(1);
      }

      logger.info("Checking monorepo scripts...");
      const result = await checkMonorepoScripts(repoRoot)(dependencies);

      validationReporter.reportValidationResult(result);

      // Exit with error code if either the Result is an error OR the validation failed
      if (result.isErr() || (result.isOk() && !result.value.isValid)) {
        process.exit(1);
      }
    });
};
