import { ok, ResultAsync } from "neverthrow";
import fs from "node:path";
import coerce from "semver/functions/coerce.js";
import semverGte from "semver/functions/gte.js";

import { Config } from "../config.js";
import { Dependencies } from "./dependencies.js";
import { Dependency } from "./package-json.js";
import { ValidationCheckResult } from "./validation.js";
import { Workspace } from "./workspace.js";

export type RepositoryReader = {
  fileExists(path: string): ResultAsync<boolean, Error>;
  findRepositoryRoot(cwd?: string): ResultAsync<string, Error>;
  getWorkspaces(repoRoot: string): ResultAsync<Workspace[], Error>;
  readFile(path: string): ResultAsync<string, Error>;
};

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
  repositoryRoot: string,
): Promise<ValidationCheckResult> => {
  const { repositoryReader } = dependencies;
  const checkName = "Pre-commit Configuration";

  const preCommitResult = await repositoryReader.fileExists(
    fs.join(repositoryRoot, ".pre-commit-config.yaml"),
  );

  if (preCommitResult.isOk() && preCommitResult.value) {
    return ok({
      checkName,
      isValid: true,
      successMessage:
        "Pre-commit configuration is present in the repository root",
    });
  }

  const errorMessage = preCommitResult.isErr()
    ? preCommitResult.error.message
    : `Pre-commit configuration is not present in the repository root. Please add a .pre-commit-config.yaml file to the repository root.`;

  return ok({
    checkName,
    errorMessage,
    isValid: false,
  });
};

export const checkNxConfig = async (
  dependencies: Pick<Dependencies, "packageJsonReader" | "repositoryReader">,
  repositoryRoot: string,
  config: Config,
): Promise<ValidationCheckResult> => {
  const { packageJsonReader, repositoryReader } = dependencies;
  const checkName = "Nx Configuration";

  const nxResult = await repositoryReader.fileExists(
    fs.join(repositoryRoot, "nx.json"),
  );
  if (nxResult.isErr()) {
    return ok({
      checkName,
      errorMessage: nxResult.error.message,
      isValid: false,
    });
  }

  if (!nxResult.value) {
    return ok({
      checkName,
      errorMessage:
        "nx.json not found in repository root. Make sure to have Nx configured for the monorepo.",
      isValid: false,
    });
  }

  const dependenciesResult = await packageJsonReader.getDependencies(
    repositoryRoot,
    "dev",
  );
  if (dependenciesResult.isErr()) {
    return ok({
      checkName,
      errorMessage: dependenciesResult.error.message,
      isValid: false,
    });
  }

  const nxVersion = dependenciesResult.value.get("nx" as Dependency["name"]);
  if (!nxVersion) {
    return ok({
      checkName,
      errorMessage:
        "Nx dependency not found in devDependencies. Please add 'nx' to your devDependencies.",
      isValid: false,
    });
  }

  if (!isVersionValid(nxVersion, config.minVersions.nx)) {
    return ok({
      checkName,
      errorMessage: `Nx version (${nxVersion}) is too low. Minimum required version is ${config.minVersions.nx}.`,
      isValid: false,
    });
  }

  return ok({
    checkName,
    isValid: true,
    successMessage:
      "Nx configuration is present in the monorepo root and Nx dependency is installed",
  });
};
