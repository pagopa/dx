import { getLogger } from "@logtape/logtape";
import { Command } from "commander";
import { okAsync, ResultAsync } from "neverthrow";
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
  "packageJsonReader" | "repositoryReader" | "validationReporter"
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

      await repositoryReader
        .findRepositoryRoot(process.cwd())
        .andThen((repoRoot) => {
          const doctorChecks = [
            ResultAsync.fromPromise(
              checkPreCommitConfig(repoRoot)(dependencies),
              () => new Error("Error checking pre-commit configuration"),
            ),
            ResultAsync.fromPromise(
              checkTurboConfig(repoRoot)(dependencies, config),
              () => new Error("Error checking Turbo configuration"),
            ),
            ResultAsync.fromPromise(
              checkMonorepoScripts(repoRoot)(dependencies),
              () => new Error("Error checking monorepo scripts"),
            ),
          ];

          return ResultAsync.combine(doctorChecks)
            .map((checkResults) =>
              checkResults
                .map((result) => {
                  // Print the message to the console
                  validationReporter.reportValidationResult(result);
                  return result;
                })
                .filter(
                  (result) =>
                    // Just keep the failed checks
                    result.isErr() || (result.isOk() && !result.value.isValid),
                ),
            )
            .andThen((failedChecks) => {
              // Doctor command should exit with a non-zero code if there are failed checks
              if (failedChecks.length > 0) {
                logger.debug(`Found ${failedChecks.length} failed checks`);
                process.exit(1);
              }
              return okAsync(void 0);
            });
        })
        .orElse(({ message }) => {
          logger.error(message);
          process.exit(1);
        });
    });
};
