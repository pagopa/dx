import { getLogger } from "@logtape/logtape";
import { Command } from "commander";
import * as process from "node:process";

import { Config } from "../../../config.js";
import { Dependencies } from "../../../domain/dependencies.js";
import { checkMonorepoScripts } from "../../../domain/package-json.js";
import {
  checkPreCommitConfig,
  checkTurboConfig,
} from "../../../domain/repository.js";

type DoctorDependencies = Pick<
  Dependencies,
  | "dependencyVersionValidator"
  | "packageJsonReader"
  | "repositoryReader"
  | "validationReporter"
>;

export const makeDoctorCommand = (
  dependencies: DoctorDependencies,
  config: Config,
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

      logger.info("Checking pre-commit configuration...");
      const preCommitResult = await checkPreCommitConfig(repoRoot)({
        repositoryReader,
      });
      validationReporter.reportValidationResult(preCommitResult);

      logger.info("Checking Turbo configuration...");
      const turboResult = await checkTurboConfig(repoRoot)(
        dependencies,
        config,
      );
      validationReporter.reportValidationResult(turboResult);

      logger.info("Checking monorepo scripts...");
      const result = await checkMonorepoScripts(repoRoot)(dependencies);

      validationReporter.reportValidationResult(result);
    });
};
