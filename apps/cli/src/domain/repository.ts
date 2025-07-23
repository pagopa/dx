import { ok, ResultAsync } from "neverthrow";
import coerce from "semver/functions/coerce.js";
import semverGte from "semver/functions/gte.js";

import { Config } from "../config.js";
import { Dependencies } from "./dependencies.js";
import { Dependency } from "./package-json.js";
import { ValidationCheckResult } from "./validation.js";

export interface RepositoryReader {
  existsPreCommitConfig(repoRoot: string): ResultAsync<boolean, Error>;
  existsTurboConfig(repoRoot: string): ResultAsync<boolean, Error>;
  fileExists(path: string): ResultAsync<boolean, Error>;
  findRepositoryRoot(cwd?: string): ResultAsync<string, Error>;
}

const isVersionValid = (version: string, minVersion: string): boolean => {
  const minAcceptedSemVer = coerce(minVersion);
  const dependencySemVer = coerce(version);

  if (!minAcceptedSemVer || !dependencySemVer) {
    return false;
  }

  return semverGte(dependencySemVer, minAcceptedSemVer);
};

export const checkPreCommitConfig = async (
  dependencies: Pick<Dependencies, "repositoryReader">,
  monorepoDir: string,
): Promise<ValidationCheckResult> => {
  const { repositoryReader } = dependencies;
  const checkName = "Pre-commit Configuration";

  const preCommitResult =
    await repositoryReader.existsPreCommitConfig(monorepoDir);
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

export const checkTurboConfig = async (
  dependencies: Pick<Dependencies, "packageJsonReader" | "repositoryReader">,
  { minVersions }: Config,
  monorepoDir: string,
): Promise<ValidationCheckResult> => {
  const { packageJsonReader, repositoryReader } = dependencies;
  const checkName = "Turbo Configuration";

  const turboResult = await repositoryReader.existsTurboConfig(monorepoDir);
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

  const turboVersion = dependenciesResult.value.get(
    "turbo" as Dependency["name"],
  );
  if (!turboVersion) {
    return ok({
      checkName,
      errorMessage:
        "Turbo dependency not found in devDependencies. Please add 'turbo' to your devDependencies.",
      isValid: false,
    });
  }

  if (!isVersionValid(turboVersion, minVersions.turbo)) {
    return ok({
      checkName,
      errorMessage: `Turbo version (${turboVersion}) is too low. Minimum required version is ${minVersions.turbo}.`,
      isValid: false,
    });
  }

  return ok({
    checkName,
    isValid: true,
    successMessage:
      "Turbo configuration is present in the monorepo root and turbo dependency is installed",
  });
};
