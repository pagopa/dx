import fs from "node:fs/promises";
import path from "node:path";

import { parseModulePublishManifest } from "./manifest.ts";

// Determines whether a Terraform module root is publishable by validating module.json.
export const hasPublishableModuleManifest = async (
  moduleRoot: string,
): Promise<boolean> => {
  const manifestPath = path.join(moduleRoot, "module.json");
  try {
    const rawManifest = await fs.readFile(manifestPath, "utf-8");
    parseModulePublishManifest(JSON.parse(rawManifest));
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }
    if (error instanceof SyntaxError || error instanceof Error) {
      return false;
    }
    throw error;
  }
};
