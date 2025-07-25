import { getLogger } from "@logtape/logtape";
import { join } from "node:path";

import { Config } from "../config.js";
import { Dependencies } from "./dependencies.js";
import { PackageManager } from "./package-json.js";

export type InfoResult = {
  packageManager: PackageManager;
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

export const getInfo = async (
  dependencies: Dependencies,
  config: Config,
): Promise<InfoResult> => ({
  packageManager: await detectPackageManager(dependencies, config),
});

export const printInfo = (result: InfoResult): void => {
  const logger = getLogger("json");
  logger.info(JSON.stringify(result));
};
