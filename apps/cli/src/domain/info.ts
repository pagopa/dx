import { getLogger } from "@logtape/logtape";
import { join } from "node:path";

import { Config } from "../config.js";
import { Dependencies } from "./dependencies.js";
import { PackageManager } from "./package-json.js";

export type InfoResult = {
  node?: string;
  packageManager: PackageManager;
  terraform?: string;
};

const detectFromLockFile = async (
  dependencies: Dependencies,
  config: Config,
): Promise<PackageManager | undefined> => {
  const { repositoryReader } = dependencies;
  const repoRoot = config.repository.root;
  const pnpmResult = await repositoryReader.fileExists(
    join(repoRoot, "pnpm-lock.yaml"),
  );
  if (pnpmResult.isOk() && pnpmResult.value) return "pnpm";
  const yarnResult = await repositoryReader.fileExists(
    join(repoRoot, "yarn.lock"),
  );
  if (yarnResult.isOk() && yarnResult.value) return "yarn";
  const npmResult = await repositoryReader.fileExists(
    join(repoRoot, "package-lock.json"),
  );
  if (npmResult.isOk() && npmResult.value) return "npm";
  return undefined;
};

const detectPackageManager = async (
  dependencies: Dependencies,
  config: Config,
): Promise<PackageManager> => {
  const packageManager =
    dependencies.packageJson.packageManager ??
    (await detectFromLockFile(dependencies, config));

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

export const getInfo = async (
  dependencies: Dependencies,
  config: Config,
): Promise<InfoResult> => ({
  node: await detectNodeVersion(
    { repositoryReader: dependencies.repositoryReader },
    `${config.repository.root}/.node-version`,
  ),
  packageManager: await detectPackageManager(dependencies, config),
  terraform: await detectTerraformVersion(
    { repositoryReader: dependencies.repositoryReader },
    `${config.repository.root}/.terraform-version`,
  ),
});

export const printInfo = (result: InfoResult): void => {
  const logger = getLogger("json");
  logger.info(JSON.stringify(result));
};
