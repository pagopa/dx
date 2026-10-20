import { ok, ResultAsync } from "neverthrow";
import fs from "node:path";
import coerce from "semver/functions/coerce.js";
import semverGte from "semver/functions/gte.js";

import { Config } from "../config.js";
import { Dependencies } from "./dependencies.js";
import {
  findNxTerraformPlugin,
  NX_TERRAFORM_PLUGIN_NAME,
  parseNxJson,
} from "./nx-json.js";
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

/**
 * Checks that the repository configures the DX Nx Terraform plugin in
 * `nx.json`, so Terraform roots take part in the DX validation pipeline.
 */
export const checkNxTerraformPlugin = async (
  dependencies: Pick<Dependencies, "repositoryReader">,
  repositoryRoot: string,
): Promise<ValidationCheckResult> => {
  const { repositoryReader } = dependencies;
  const checkName = "Nx Terraform Plugin";

  const nxJsonResult = await repositoryReader.readFile(
    fs.join(repositoryRoot, "nx.json"),
  );
  if (nxJsonResult.isErr()) {
    return ok({
      checkName,
      errorMessage: `Could not read nx.json: ${nxJsonResult.error.message}. Make sure to have Nx configured for the monorepo.`,
      isValid: false,
    });
  }

  const parsed = parseNxJson(nxJsonResult.value);
  if (parsed.error !== undefined) {
    return ok({
      checkName,
      errorMessage: `${parsed.error}.`,
      isValid: false,
    });
  }

  if (findNxTerraformPlugin(parsed.nxJson) === undefined) {
    return ok({
      checkName,
      errorMessage: `The ${NX_TERRAFORM_PLUGIN_NAME} plugin is not configured in nx.json. Add it to align the repository with the DX Terraform validation pipeline.`,
      isValid: false,
    });
  }

  return ok({
    checkName,
    isValid: true,
    successMessage: `${NX_TERRAFORM_PLUGIN_NAME} is configured in nx.json`,
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
