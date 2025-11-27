import { getLogger } from "@logtape/logtape";
import { join } from "node:path";

import { Config } from "../config.js";
import { Dependencies } from "./dependencies.js";
import { PackageManager } from "./package-json.js";

export type InfoResult = {
  node?: string;
  packageManager: PackageManager;
  terraform?: string;
  turbo?: string;
};

const detectFromLockFile = async (
  dependencies: Dependencies,
  repositoryRoot: string,
): Promise<PackageManager | undefined> => {
  const { repositoryReader } = dependencies;
  const pnpmResult = await repositoryReader.fileExists(
    join(repositoryRoot, "pnpm-lock.yaml"),
  );
  if (pnpmResult.isOk() && pnpmResult.value) return "pnpm";
  const yarnResult = await repositoryReader.fileExists(
    join(repositoryRoot, "yarn.lock"),
  );
  if (yarnResult.isOk() && yarnResult.value) return "yarn";
  const npmResult = await repositoryReader.fileExists(
    join(repositoryRoot, "package-lock.json"),
  );
  if (npmResult.isOk() && npmResult.value) return "npm";
  return undefined;
};

const detectPackageManager = async (
  dependencies: Dependencies,
  repositoryRoot: string,
): Promise<PackageManager> => {
  // Try to read package.json to get packageManager field
  const packageJsonResult =
    await dependencies.packageJsonReader.readPackageJson(repositoryRoot);

  const packageManager =
    packageJsonResult.map((pkg) => pkg.packageManager).unwrapOr(undefined) ??
    (await detectFromLockFile(dependencies, repositoryRoot));

  return packageManager ?? "npm";
};

const detectNodeVersion = async (
  { repositoryReader }: Pick<Dependencies, "repositoryReader">,
  nodeVersionFilePath: `${string}/.node-version`,
): Promise<string | undefined> =>
  await repositoryReader
    .readFile(nodeVersionFilePath)
    .map((nodeVersion) => nodeVersion.trim())
    .unwrapOr(undefined);

const detectTerraformVersion = async (
  { repositoryReader }: Pick<Dependencies, "repositoryReader">,
  terraformVersionFilePath: `${string}/.terraform-version`,
): Promise<string | undefined> =>
  await repositoryReader
    .readFile(terraformVersionFilePath)
    .map((tfVersion) => tfVersion.trim())
    .unwrapOr(undefined);

const detectTurboVersion = async (
  dependencies: Dependencies,
  repositoryRoot: string,
): Promise<string | undefined> => {
  const packageJsonResult =
    await dependencies.packageJsonReader.readPackageJson(repositoryRoot);

  return packageJsonResult
    .map((pkg) => pkg.devDependencies.get("turbo")?.trim())
    .unwrapOr(undefined);
};

export type GetInfo = () => Promise<InfoResult>;

export const getInfo =
  (
    dependencies: Dependencies,
    config: Config,
    repositoryRoot: string,
  ): GetInfo =>
  async (): Promise<InfoResult> => ({
    node: await detectNodeVersion(
      { repositoryReader: dependencies.repositoryReader },
      `${repositoryRoot}/.node-version`,
    ),
    packageManager: await detectPackageManager(dependencies, repositoryRoot),
    terraform: await detectTerraformVersion(
      { repositoryReader: dependencies.repositoryReader },
      `${repositoryRoot}/.terraform-version`,
    ),
    turbo: await detectTurboVersion(dependencies, repositoryRoot),
  });

export const printInfo = (result: InfoResult): void => {
  const logger = getLogger("json");
  logger.info(JSON.stringify(result));
};
