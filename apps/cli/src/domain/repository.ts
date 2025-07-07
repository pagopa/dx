import { ok, Result } from "neverthrow";

import { Config } from "../config.js";
import { Dependencies } from "./dependencies.js";
import { ValidationCheckResult } from "./validation.js";

export interface RepositoryReader {
  existsPreCommitConfig(repoRoot: string): Result<boolean, Error>;
  existsTurboConfig(repoRoot: string): Result<boolean, Error>;
  findRepositoryRoot(cwd: string): Result<string, Error>;
}

export const checkPreCommitConfig =
  (monorepoDir: string) =>
  async (
    dependencies: Pick<Dependencies, "repositoryReader">,
  ): Promise<ValidationCheckResult> => {
    const { repositoryReader } = dependencies;
    const checkName = "Pre-commit Configuration";

    const preCommitResult = repositoryReader.existsPreCommitConfig(monorepoDir);
    if (preCommitResult.isErr()) {
      return ok({
        checkName,
        errorMessage: preCommitResult.error.message,
        isValid: false,
      });
    }

    return ok({
      checkName,
      isValid: true,
      successMessage:
        "Pre-commit configuration is present in the repository root",
    });
  };

export const checkTurboConfig =
  (monorepoDir: string) =>
  async (
    dependencies: Pick<
      Dependencies,
      "dependencyVersionValidator" | "packageJsonReader" | "repositoryReader"
    >,
    { minVersions }: Config,
  ): Promise<ValidationCheckResult> => {
    const { dependencyVersionValidator, packageJsonReader, repositoryReader } =
      dependencies;
    const checkName = "Turbo Configuration";

    const turboResult = repositoryReader.existsTurboConfig(monorepoDir);
    if (turboResult.isErr()) {
      return ok({
        checkName,
        errorMessage: turboResult.error.message,
        isValid: false,
      });
    }

    const dependenciesResult = await packageJsonReader.getDependencies(
      monorepoDir,
      "dev",
    );
    if (dependenciesResult.isErr()) {
      return ok({
        checkName,
        errorMessage: dependenciesResult.error.message,
        isValid: false,
      });
    }

    const turboDependency = dependenciesResult.value.find(
      ({ name }) => name === "turbo",
    );
    if (!turboDependency) {
      return ok({
        checkName,
        errorMessage:
          "Turbo dependency not found in devDependencies. Please add 'turbo' to your devDependencies.",
        isValid: false,
      });
    }

    return dependencyVersionValidator.isValid(
      turboDependency,
      minVersions.turbo,
    )
      ? ok({
          checkName,
          isValid: true,
          successMessage:
            "Turbo configuration is present in the monorepo root and turbo dependency is installed",
        })
      : ok({
          checkName,
          errorMessage: `Turbo version (${turboDependency.version}) is too low. Minimum required version is ${minVersions.turbo}.`,
          isValid: false,
        });
  };
