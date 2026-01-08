/**
 * Terraform package creation utilities.
 */

import { mkdir, writeFile } from "fs/promises";
import * as path from "path";

import type { TerraformConfig } from "../../core/config/config.schema.js";

import { FileError } from "../../core/errors/index.js";
import {
  generateBackendTfvars,
  generateMainTf,
  generateTerraformTfvars,
  generateVariablesTf,
} from "./terraform-assets.js";

/**
 * Generate Terraform assets (main.tf, variables.tf) in output directory.
 */
export async function generateTerraformAssets(
  outputPath: string,
  terraformConfig?: TerraformConfig,
): Promise<void> {
  try {
    // Generate main.tf and variables.tf in parallel
    const mainTfContent = generateMainTf();
    const variablesTfContent = generateVariablesTf();

    await Promise.all([
      writeFile(path.join(outputPath, "main.tf"), mainTfContent, "utf-8"),
      writeFile(
        path.join(outputPath, "variables.tf"),
        variablesTfContent,
        "utf-8",
      ),
    ]);

    // Generate env/ directories for dev, uat, prod
    if (terraformConfig?.environments) {
      const envPromises = [];

      for (const [env, envConfig] of Object.entries(
        terraformConfig.environments,
      )) {
        if (envConfig) {
          const envPath = path.join(outputPath, "env", env);

          // Create directory and write files for each environment
          const envPromise = (async () => {
            await mkdir(envPath, { recursive: true });

            // Generate backend.tfvars and terraform.tfvars in parallel
            const backendTfvarsContent = generateBackendTfvars(
              envConfig.backend,
            );
            const terraformTfvarsContent = generateTerraformTfvars(envConfig);

            await Promise.all([
              writeFile(
                path.join(envPath, "backend.tfvars"),
                backendTfvarsContent,
                "utf-8",
              ),
              writeFile(
                path.join(envPath, "terraform.tfvars"),
                terraformTfvarsContent,
                "utf-8",
              ),
            ]);
          })();

          envPromises.push(envPromise);
        }
      }

      await Promise.all(envPromises);
    }
  } catch (error) {
    throw new FileError(
      `Failed to generate Terraform assets in ${outputPath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
