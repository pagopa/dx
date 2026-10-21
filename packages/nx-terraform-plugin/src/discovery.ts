import fs from "node:fs/promises";
import path from "node:path";

import { getPackageLogger } from "./logger.ts";
import {
  parseTerraformProjectMetadata,
  type TerraformProjectMetadata,
  TerraformProjectMetadataError,
} from "./project-metadata.ts";

export const readTerraformProjectMetadata = async (
  projectRoot: string,
): Promise<TerraformProjectMetadata | undefined> => {
  const projectJsonPath = path.join(projectRoot, "project.json");
  const logger = getPackageLogger(["discovery"]);
  try {
    const projectJson: unknown = JSON.parse(
      await fs.readFile(projectJsonPath, "utf-8"),
    );
    if (
      typeof projectJson !== "object" ||
      projectJson === null ||
      !("metadata" in projectJson)
    ) {
      return undefined;
    }
    return parseTerraformProjectMetadata(projectJson.metadata);
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
        `Invalid project configuration at ${projectJsonPath}. ${error.message}`,
      );
      return undefined;
    }
    if (error instanceof TerraformProjectMetadataError) {
      logger.warn("Invalid Terraform publishing metadata", {
        issues: error.issues,
        path: projectJsonPath,
      });
      return undefined;
    }
    throw error;
  }
};

// Determines whether a Terraform module is publishable by validating its project metadata.
export const hasPublishableTerraformMetadata = async (
  projectRoot: string,
): Promise<boolean> => {
  const metadata = await readTerraformProjectMetadata(projectRoot);
  return metadata !== undefined;
};
