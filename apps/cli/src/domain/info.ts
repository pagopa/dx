import { getLogger } from "@logtape/logtape";
import { join } from "node:path";

import { Dependencies } from "./dependencies.js";
import { PackageJson } from "./package-json.js";

export interface InfoResult {
  packageManager: "npm" | "pnpm" | "yarn";
}

const detectFromLockFile = async (
  dependencies: Dependencies,
): Promise<"npm" | "pnpm" | "yarn" | undefined> => {
  const { repositoryReader } = dependencies;
  const repoRootResult = await repositoryReader.findRepositoryRoot(
    process.cwd(),
  );
  if (repoRootResult.isErr()) return undefined;
  const repoRoot = repoRootResult.value;
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
): Promise<InfoResult["packageManager"]> => {
  const packageManager = detectFromPackageJson(dependencies.packageJson);
  if (!packageManager) {
    // Detect from lock files
    const packageManagerFromLockFile = await detectFromLockFile(dependencies);
    // If no lock file is found, default to npm
    return packageManagerFromLockFile ? packageManagerFromLockFile : "npm";
  }
  return packageManager;
};
const detectFromPackageJson = ({ packageManager }: PackageJson) => {
  if (packageManager?.startsWith("pnpm")) {
    return "pnpm";
  } else if (packageManager?.startsWith("yarn")) {
    return "yarn";
  } else if (packageManager?.startsWith("npm")) {
    return "npm";
  }
  return undefined;
};

export const getInfo = async (
  dependencies: Dependencies,
): Promise<InfoResult> => ({
  packageManager: await detectPackageManager(dependencies),
});

export const printInfo = (result: InfoResult): void => {
  const logger = getLogger("json");
  logger.info(result as unknown as Record<string, unknown>);
};
