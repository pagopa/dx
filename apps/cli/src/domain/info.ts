import { getLogger } from "@logtape/logtape";

import { Dependencies } from "./dependencies.js";
import { PackageJson } from "./package-json.js";

export interface InfoResult {
  packageManager: "npm" | "pnpm" | "yarn";
}

// TODO: Implement this. Just a placeholder for now.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const detectFromLockFile = (dependencies: Dependencies) => {
  const lockFile = undefined;
  return lockFile;
};

const detectPackageManager = (
  dependencies: Dependencies,
): InfoResult["packageManager"] => {
  const packageManager = detectFromPackageJson(dependencies.packageJson);
  if (!packageManager) {
    // Detect from lock files
    const packageManagerFromLockFile = detectFromLockFile(dependencies);
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

export const getInfo = (dependencies: Dependencies): InfoResult => ({
  packageManager: detectPackageManager(dependencies),
});

export const printInfo = (result: InfoResult): void => {
  const logger = getLogger("json");
  logger.info(result as unknown as Record<string, unknown>);
};
