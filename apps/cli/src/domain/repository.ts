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
  config: Config,
): Promise<ValidationCheckResult> => {
  const { repositoryReader } = dependencies;
  const checkName = "Pre-commit Configuration";

  const preCommitResult = await repositoryReader.fileExists(
    fs.join(config.repository.root, ".pre-commit-config.yaml"),
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

export const checkTurboConfig = async (
  dependencies: Pick<Dependencies, "packageJsonReader" | "repositoryReader">,
  config: Config,
): Promise<ValidationCheckResult> => {
  const { packageJsonReader, repositoryReader } = dependencies;
  const checkName = "Turbo Configuration";
  const repoRoot = config.repository.root;

  const turboResult = await repositoryReader.fileExists(
    fs.join(repoRoot, "turbo.json"),
  );
  if (turboResult.isErr()) {
    return ok({
      checkName,
      errorMessage: turboResult.error.message,
      isValid: false,
    });
  }

  const dependenciesResult = await packageJsonReader.getDependencies(
    repoRoot,
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

  if (!isVersionValid(turboVersion, config.minVersions.turbo)) {
    return ok({
      checkName,
      errorMessage: `Turbo version (${turboVersion}) is too low. Minimum required version is ${config.minVersions.turbo}.`,
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

export const checkWorkspaces =
  (monorepoDir: string) =>
  async (
    dependencies: Pick<Dependencies, "repositoryReader">,
  ): Promise<ValidationCheckResult> => {
    const { repositoryReader } = dependencies;
    const checkName = "Workspaces";

    const workspacesResult = await repositoryReader.getWorkspaces(monorepoDir);
    if (workspacesResult.isErr()) {
      return ok({
        checkName,
        errorMessage:
          "Something is wrong with the workspaces configuration. If you need help, please contact the DevEx team.",
        isValid: false,
      });
    }

    const workspaces = workspacesResult.value;
    const nonRootWorkspaces = workspaces.filter(
      ({ path }) => path !== monorepoDir,
    );

    if (nonRootWorkspaces.length === 0) {
      return ok({
        checkName,
        errorMessage:
          "No workspaces found in the repository. Make sure to have at least one workspace configured.",
        isValid: false,
      });
    }

    const workspacesNumber = nonRootWorkspaces.length;

    return ok({
      checkName,
      isValid: true,
      successMessage: `Found ${workspacesNumber} ${
        workspacesNumber === 1 ? "workspace" : "workspaces"
      } in the repository`,
    });
  };
