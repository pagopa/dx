import fs from "node:fs/promises";
import path from "node:path";

import { getPackageLogger } from "./logger.ts";
import {
  ModulePublishManifest,
  ModulePublishManifestError,
  parseModulePublishManifest,
} from "./manifest.ts";

export const readModulePublishManifest = async (
  moduleRoot: string,
): Promise<ModulePublishManifest | undefined> => {
  const manifestPath = path.join(moduleRoot, "module.json");
  const logger = getPackageLogger(["discovery"]);
  try {
    const rawManifest = await fs.readFile(manifestPath, "utf-8");
    return parseModulePublishManifest(JSON.parse(rawManifest));
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return undefined;
    }
    if (error instanceof SyntaxError) {
      logger.warn(
        `Invalid module manifest at ${manifestPath}. ${error.message}`,
      );
      return undefined;
    }
    if (error instanceof ModulePublishManifestError) {
      logger.warn("Invalid manifest file", {
        issues: error.issues,
        path: manifestPath,
      });
      return undefined;
    }
    throw error;
  }
};

// Determines whether a Terraform module root is publishable by validating module.json.
export const hasPublishableModuleManifest = async (
  moduleRoot: string,
): Promise<boolean> => {
  const manifest = await readModulePublishManifest(moduleRoot);
  return manifest !== undefined;
};
